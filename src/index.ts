/*!
 * tque <https://github.com/lionel87/tque>
 *
 * Copyright (c) 2021, László BULIK.
 * Released under the MPL-2.0 License.
 */

import assign from 'assign-deep';
import clone from 'clone-deep';

import { HandlerError } from './handler-error';
export { HandlerError };

const detachObjectSymbol = Symbol('__detachObjectMode');
const internalsSymbol = Symbol('__internals');

export const symbols = {
    detachObject: detachObjectSymbol,
    internals: internalsSymbol,
};

export type Handler<ThisArg, Data> = { (this: ThisArg, data: Data): HandlerResult<Data> | Promise<HandlerResult<Data>> };
type HandlerResult<Data> = void | undefined | null | boolean | Data | Promise<void | undefined | null | boolean | Data> |
    (void | undefined | null | boolean | Data | Promise<void | undefined | null | boolean | Data>)[];

type HandlerArg<ThisArg, Data> = Handler<ThisArg, Data> | Iterable<Handler<ThisArg, Data>>;
type DataArg<Data> = Data | Iterable<Data> | AsyncIterable<Data>;

type BranchApi<Base, Data> = {
    api: Api<Base, Data>;
    que: Handler<Api<Base, Data>, Data>[];
    data: Data;
    childBranches: BranchApi<Base, Data>[];
    branch(data?: Data): BranchApi<Base, Data>;
    consume(): Promise<Data[]>;
};

export type Api<Base, Data> = {
    [internalsSymbol]: BranchApi<Base, Data>;
    series: { <Data extends object = any, Base extends object = {}>(...args: HandlerArg<Api<Base, Data>, Data>[]): { (this: Api<Base, Data>, data: DataArg<Data>): Promise<Data[]> } };
    parallel: { <Data extends object = any, Base extends object = {}>(...args: HandlerArg<Api<Base, Data>, Data>[]): { (this: Api<Base, Data>, data: DataArg<Data>): Promise<Data[]> } };
    branch: { <Data extends object = any, Base extends object = {}>(...args: HandlerArg<Api<Base, Data>, Data>[]): { (this: Api<Base, Data>, data: DataArg<Data>): Promise<Data[]> } };
    next(...args: (Handler<Api<Base, Data>, Data> | Handler<Api<Base, Data>, Data>[])[]): Api<Base, Data>;
    push(...args: (Handler<Api<Base, Data>, Data> | Handler<Api<Base, Data>, Data>[])[]): Api<Base, Data>;
    rebase(data: Data): void;
    detached(data: Data): Data;
} & Base;

const isIterable = <T>(arg: any): arg is Iterable<T> => arg && typeof arg[Symbol.iterator] === 'function';
const isAsyncIterable = <T>(arg: any): arg is AsyncIterable<T> => arg && typeof arg[Symbol.asyncIterator] === 'function';
const isApi = <T, D>(arg: any): arg is Api<T, D> => arg && typeof arg[internalsSymbol] === 'object';
const isHandler = <T, D>(arg: any): arg is Handler<T, D> => typeof arg === 'function';
const isObject = (arg: unknown): arg is object => !!arg && typeof arg === 'object';

const getType = (arg: unknown): string => typeof arg === 'object' ? (arg ? 'object' : 'null') : (typeof arg);

function flattenHandlers<ThisArg, Data>(args: HandlerArg<ThisArg, Data>[]) {
    const result: Handler<ThisArg, Data>[] = [];
    for (let arg of args) {
        let iterableArg: Iterable<unknown> | unknown[];
        if (isIterable(arg)) {
            iterableArg = arg;
        } else {
            iterableArg = [arg];
        }
        for (const a of iterableArg) {
            if (isHandler<ThisArg, Data>(a)) {
                result.push(a);
            }
        }
    }
    return result;
}

/**
 * Low level api to create a new que/branch.
 */
export function createInterface<Data extends object = any, Base extends object = {}>(
    data: Data,
    que: Handler<Api<Base, Data>, Data>[] = [],
    base?: Base
): BranchApi<Base, Data> {
    const self = <BranchApi<Base, Data>><unknown>{ que, data, childBranches: [] };

    // api visible to handler functions via 'this' arg.
    self.api = Object.assign({
        [internalsSymbol]: self,
        series,
        parallel,
        branch,
        next(...args: (Handler<Api<Base, Data>, Data> | Handler<Api<Base, Data>, Data>[])[]): Api<Base, Data> {
            Array.prototype.unshift.apply(self.que, flattenHandlers<Api<Base, Data>, Data>(args));
            return self.api;
        },
        push(...args: (Handler<Api<Base, Data>, Data> | Handler<Api<Base, Data>, Data>[])[]): Api<Base, Data> {
            Array.prototype.push.apply(self.que, flattenHandlers<Api<Base, Data>, Data>(args));
            return self.api;
        },
        rebase(data: Data): void {
            self.data = data;
        },
        detached(data: Data): Data {
            (<any>data)[detachObjectSymbol] = true;
            return data;
        }
    }, <Base>(base || {}));

    // creates a new que for the provided data based on the current que state
    self.branch = (data?: Data): BranchApi<Base, Data> => {
        const branch = createInterface(data || clone(self.data), [...self.que], base);
        self.childBranches.unshift(branch);
        return branch;
    };

    // consumes the items of this que and return results in array
    self.consume = async () => {
        const queResult: Data[] = [];
        let terminateWithoutResult = false;

        while (self.que.length > 0) {
            const handler = <Handler<Api<Base, Data>, Data>>self.que.shift(); // que always have items here, so no undefined results.

            let results: HandlerResult<Data>;
            try {
                results = await handler.call(self.api, self.data);
            } catch (error) {
                throw new HandlerError(error, self.data, handler);
            }

            if (!Array.isArray(results)) {
                results = [results];
            }

            if (results.length > 0) {
                const result0 = await results.shift(); // await: maybe a promise

                // schedule new branches
                for await (const result of results) { // for-await-of: results may contain promises
                    if (result !== false) { // if not exiting
                        if (result !== true) {
                            if (result && typeof result === 'object') { // object
                                if ((<any>result)[detachObjectSymbol]) { // do not merge
                                    delete (<any>result)[detachObjectSymbol];
                                    self.branch(result);
                                } else { // please merge
                                    self.branch(assign(clone(self.data), result));
                                }
                            } else { // underlying data already modified; result is undefined, null, string, number, ...
                                self.branch(clone(self.data));
                            }
                        } else {
                            // returned true in an array (eg: [..., true, ...])
                            // we branch the que (because the array), but true value signals the que end.
                            queResult.push(clone(self.data));
                        }
                    }
                }

                // handle possible return values
                if (result0 && typeof result0 === 'object') { // que continues ...
                    if ((<any>result0)[detachObjectSymbol]) { // do not merge
                        delete (<any>result0)[detachObjectSymbol];
                        self.data = result0;
                    } else { // please merge
                        assign(self.data, result0);
                    }
                } else if (result0 === true) { // que exits
                    break;
                } else if (result0 === false) { // que exits without result
                    terminateWithoutResult = true;
                    break;
                }
            } else { // empty array returned, exit without result
                terminateWithoutResult = true;
                break;
            }
        }

        // this que is done. handle its return value
        if (!terminateWithoutResult) {
            queResult.push(self.data);
        }

        // at this point this que is empty
        // but we need to get results from the child ques too
        for (const branch of self.childBranches) {
            Array.prototype.push.apply(queResult, await branch.consume());
        }

        return queResult;
    };

    return self;
}

/**
 * Helper method to create a new que with a single handler function.
 */
export function create<Data extends object = any>(
    handler: Handler<Api<{}, Data>, Data>
): { (data: DataArg<Data>): Promise<Data[]> } {
    return async function (data: DataArg<Data>) {
        const results: Data[] = [];
        const forAwaitOfIterableData = isIterable(data) || isAsyncIterable(data) ? data : [data];
        for await (const d of forAwaitOfIterableData) {
            if (!isObject(d)) {
                throw new Error(`Only object inputs are allowed, got '${getType(d)}'.`);
            }
            const que = createInterface(clone(d), [handler]);
            const queResults = await que.consume();
            Array.prototype.push.apply(results, queResults);
        }
        return results;
    }
}

/**
 * Helper method to assign custom values to the `this` arg of queued handlers.
 *
 * ```js
 * // Example usage
 * const result = await createWithContext(
 *     {
 *         myUtilityFunction(){...}
 *     },
 *     series(
 *         ...,
 *         function() {
 *             this.myUtilityFunction();
 *         },
 *         ...
 *     )
 * )(data);
 * ```
 */
export function createWithContext<Data extends object = any, Base extends object = {}>(
    thisArg: Base,
    handler: Handler<Api<Base, Data>, Data>
): { (data: DataArg<Data>): Promise<Data[]> } {
    return async function (data: DataArg<Data>) {
        const results: Data[] = [];
        const forAwaitOfIterableData = isIterable(data) || isAsyncIterable(data) ? data : [data];
        for await (const d of forAwaitOfIterableData) {
            if (!isObject(d)) {
                throw new Error(`Only object inputs are allowed, got '${getType(d)}'.`);
            }
            const que = createInterface(clone(d), [handler], thisArg);
            const queResults = await que.consume();
            Array.prototype.push.apply(results, queResults);
        }
        return results;
    }
}

/**
 * Queue handler functions and execute them in series.
 */
export function series<Data extends object = any, Base extends object = {}>(
    ...args: HandlerArg<Api<Base, Data>, Data>[]
): (this: Api<Base, Data> | void, data: DataArg<Data>) => Promise<Data[]>;
export function series<Data extends object = any, Base extends object = {}>(
    ...args: HandlerArg<Api<Base, Data>, Data>[]
): (this: Api<Base, Data> | void, data: DataArg<Data>) => Promise<Data[] | undefined> {
    const handlers = flattenHandlers(args);
    return async function (data) {
        if (isApi<Base, Data>(this)) {
            // (A): called as part of an existing que.
            // use the existing branch to que up hanlers. do not return any result.
            this.next(handlers);
        } else {
            // (B): this is the initiator of a new que.
            // start a new branch, que the handlers, consume, then return result array.
            const results: Data[] = [];
            const forAwaitOfIterableData = isIterable(data) || isAsyncIterable(data) ? data : [data]; // incl. array with promises
            for await (const d of forAwaitOfIterableData) {
                if (!isObject(d)) {
                    throw new Error(`Only object inputs are allowed, got '${getType(d)}'.`);
                }
                const que = createInterface(clone(d), [...handlers]);
                const queResults = await que.consume();
                Array.prototype.push.apply(results, queResults);
            }
            return results;
        }
    }
}

/**
 * Splits data into multiple queues.
 *
 * For each input function, the que is cloned, the function is prepended.
 */
export function branch<Data extends object = any, Base extends object = {}>(
    ...args: HandlerArg<Api<Base, Data>, Data>[]
): (this: Api<Base, Data> | void, data: DataArg<Data>) => Promise<Data[]>;
export function branch<Data extends object = any, Base extends object = {}>(
    ...args: HandlerArg<Api<Base, Data>, Data>[]
): (this: Api<Base, Data> | void, data: DataArg<Data>) => Promise<Data[] | undefined> {
    const handlers = flattenHandlers(args);
    return async function (data) {
        if (isApi<Base, Data>(this)) {
            for (let i = 1; i < handlers.length; i++) {
                const handler = handlers[i];
                this[internalsSymbol].branch().api.next(handler);
            }
            if (handlers.length > 0) {
                this.next(handlers[0]);
            }
        } else {
            const results: Data[] = [];
            const forAwaitOfIterableData = isIterable(data) || isAsyncIterable(data) ? data : [data];
            for await (const d of forAwaitOfIterableData) {
                if (!isObject(d)) {
                    throw new Error(`Only object inputs are allowed, got '${getType(d)}'.`);
                }
                for (const handler of handlers) {
                    const que = createInterface(clone(d), [handler]);
                    const queResults = await que.consume();
                    Array.prototype.push.apply(results, queResults);
                }
            }
            return results;
        }
    }
}

/**
 * Executes all handlers simultaneously on the data.
 * The goal here is to speed up tasks that can work well asynchronously, like database or HTTP requests.
 *
 * Each handler works at the same time on the same dataset, so:\
 * __Use with caution!__
 *
 * - If any handler returns `false`, the que terminates without result; no other rule apply below.
 * - If any handler returns `true`, the que stops and returns the data, including
 *   all modifications of this step (other handler results will be merged).
 * - If any handler returns array, the first element will be used, the rest is dropped, to avoid too much complexity.
 * - `.rebase(data)` calls have unpredictable results; do not use.
 * - `.detached(data)` calls have unpredictable results; do not use.
 * - `branch(handlers)` function have unpredictable results; do not use.
  */
export function parallel<Data extends object = any, Base extends object = {}>(
    ...args: HandlerArg<Api<Base, Data>, Data>[]
): (this: Api<Base, Data> | void, data: DataArg<Data>) => Promise<Data[]>;
export function parallel<Data extends object = any, Base extends object = {}>(
    ...args: HandlerArg<Api<Base, Data>, Data>[]
): (this: Api<Base, Data> | void, data: DataArg<Data>) => Promise<Data[] | undefined | boolean> {
    const handlers = flattenHandlers(args);
    return async function (data) {
        if (isApi<Base, Data>(this)) {
            const api = this;
            const internals = api[internalsSymbol];

            let handlerResults: HandlerResult<Data>[];
            try {
                handlerResults = await Promise.all(handlers.map(handler => handler.call(api, internals.data)));
            } catch (error) { 
                throw new HandlerError(error, internals.data);
            }

            if (handlerResults.some(r => r === false || (Array.isArray(r) && r.some(r => r === false)))) { // if the que exits, prevent heavy work early
                return false;
            }

            let endThisQue = false;
            for (let handlerResult of handlerResults) {
                if (!Array.isArray(handlerResult)) {
                    handlerResult = [handlerResult];
                }
                const handerResult0 = await handlerResult.shift();
                if (handerResult0 !== true) {
                    if (handerResult0 && typeof handerResult0 === 'object') { // object
                        if ((<any>handerResult0)[detachObjectSymbol]) { // do not merge
                            internals.data = handerResult0;
                        } else { // please merge
                            assign(internals.data, handerResult0);
                        }
                    }
                } else {
                    endThisQue = true;
                }
            }

            if (endThisQue) {
                return true;
            }
        } else {
            const results: Data[] = [];
            const forAwaitOfIterableData = isIterable(data) || isAsyncIterable(data) ? data : [data];
            for await (const d of forAwaitOfIterableData) {
                if (!isObject(d)) {
                    throw new Error(`Only object inputs are allowed, got '${getType(d)}'.`);
                }

                const internals = createInterface<Data, Base>(clone(d), []);

                let handlerResults: HandlerResult<Data>[];
                try {
                    handlerResults = await Promise.all(handlers.map(handler => handler.call(internals.api, internals.data)));
                } catch (error) { 
                    throw new HandlerError(error, internals.data);
                }

                if (handlerResults.some(r => r === false || (Array.isArray(r) && r.some(r => r === false)))) { // if the que exits, prevent heavy work early
                    break;
                }

                let endThisQue = false;
                for (let handlerResult of handlerResults) {
                    if (!Array.isArray(handlerResult)) {
                        handlerResult = [handlerResult];
                    }
                    const handerResult0 = await handlerResult.shift();
                    if (handerResult0 !== true) {
                        if (handerResult0 && typeof handerResult0 === 'object') { // object
                            if ((<any>handerResult0)[detachObjectSymbol]) { // do not merge
                                internals.data = handerResult0;
                            } else { // please merge
                                assign(internals.data, handerResult0);
                            }
                        }
                    } else {
                        endThisQue = true;
                    }
                }

                if (endThisQue) {
                    results.push(internals.data);
                } else {
                    const queResults = await internals.consume();
                    Array.prototype.push.apply(results, queResults);
                }
            }
            return results;
        }
    }
}
