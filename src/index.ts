/*!
 * tque <https://github.com/lionel87/tque>
 *
 * Copyright (c) 2021, László BULIK.
 * Released under the MPL-2.0 License.
 */

import { Readable } from 'stream';
import assign from 'assign-deep';
import clone from 'clone-deep';

import { HandlerError } from './handler-error';
export { HandlerError };

export const detachedObjectSymbol = Symbol('__detachedObjectMode');
export const internalsSymbol = Symbol('__internals');

export type Handler<ThisArg, Data> = { (this: ThisArg, data: Data): HandlerResult<Data> | Promise<HandlerResult<Data>> };
type HandlerResult<Data> = void | undefined | null | boolean | Data | Promise<void | undefined | null | boolean | Data> |
    (void | undefined | null | boolean | Data | Promise<void | undefined | null | boolean | Data>)[];

type HandlerArg<ThisArg, Data> = Handler<ThisArg, Data> | Iterable<Handler<ThisArg, Data>>;
type DataArg<Data> = Data | Iterable<Data> | AsyncIterable<Data>;

type HandlerComposition<Base, Data> = {
    (this: Api<Base, Data> | void, data: DataArg<Data>): Promise<Data[]>;
    stream(data: DataArg<Data>): Readable;
};

// series(), branch(), parallel() returns void if called by other series(), branch(), parallel()
// this is an internal-ish behaviour, so we shadow the undefined return value
type InternalHandlerComposition<Base, Data> = {
    (this: Api<Base, Data> | void, data: DataArg<Data>): Promise<Data[] | undefined>;
    stream(data: DataArg<Data>): Readable;
};

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
            (<any>data)[detachedObjectSymbol] = true;
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
                                if ((<any>result)[detachedObjectSymbol]) { // do not merge
                                    delete (<any>result)[detachedObjectSymbol];
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
                    if ((<any>result0)[detachedObjectSymbol]) { // do not merge
                        delete (<any>result0)[detachedObjectSymbol];
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
): {
    (data: DataArg<Data>): Promise<Data[]>;
    stream(data: DataArg<Data>): Readable;
} {
    const fn = async function (data: DataArg<Data>) {
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
    } as HandlerComposition<{}, Data>;
    
    fn.stream = function (data: DataArg<Data>): Readable {
        let iterator: Iterator<Data> | AsyncIterator<Data>;
        if (isIterable(data)) {
            iterator = data[Symbol.iterator]();
        } else if (isAsyncIterable(data)) {
            iterator = data[Symbol.asyncIterator]();
        } else {
            iterator = [data][Symbol.iterator]();
        }

        return new Readable({
            objectMode: true,
            async read() {
                while (true) {
                    const it = await iterator.next();

                    if (it.done) {
                        this.push(null);
                        break;
                    } else {
                        if (!isObject(it.value)) {
                            throw new Error(`Only object inputs are allowed, got '${getType(it.value)}'.`);
                        }

                        const que = createInterface(clone(it.value), [handler]);
                        const queResults = await que.consume();

                        if (queResults.length > 0) {
                            for (const r of queResults) {
                                this.push(r);
                            }
                            break;
                        }
                    }
                }
            }
        });
    };

    return fn;
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
): {
    (data: DataArg<Data>): Promise<Data[]>;
    stream(data: DataArg<Data>): Readable;
} {
    const fn = async function (data: DataArg<Data>) {
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
    } as HandlerComposition<Base, Data>;
    
    fn.stream = function (data: DataArg<Data>): Readable {
        let iterator: Iterator<Data> | AsyncIterator<Data>;
        if (isIterable(data)) {
            iterator = data[Symbol.iterator]();
        } else if (isAsyncIterable(data)) {
            iterator = data[Symbol.asyncIterator]();
        } else {
            iterator = [data][Symbol.iterator]();
        }

        return new Readable({
            objectMode: true,
            async read() {
                while (true) {
                    const it = await iterator.next();

                    if (it.done) {
                        this.push(null);
                        break;
                    } else {
                        if (!isObject(it.value)) {
                            throw new Error(`Only object inputs are allowed, got '${getType(it.value)}'.`);
                        }

                        const que = createInterface(clone(it.value), [handler], thisArg);
                        const queResults = await que.consume();

                        if (queResults.length > 0) {
                            for (const r of queResults) {
                                this.push(r);
                            }
                            break;
                        }
                    }
                }
            }
        });
    };

    return fn;
}


/**
 * Queue handler functions and execute them in series.
 */
export function series<Data extends object = any, Base extends object = {}>(
    ...args: HandlerArg<Api<Base, Data>, Data>[]
): HandlerComposition<Base, Data>;

export function series<Data extends object = any, Base extends object = {}>(
    ...args: HandlerArg<Api<Base, Data>, Data>[]
) {
    const handlers = flattenHandlers(args);
    const fn = async function (data) {
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
    } as InternalHandlerComposition<Base, Data>;

    fn.stream = function (data: DataArg<Data>): Readable {
        let iterator: Iterator<Data> | AsyncIterator<Data>;
        if (isIterable(data)) {
            iterator = data[Symbol.iterator]();
        } else if (isAsyncIterable(data)) {
            iterator = data[Symbol.asyncIterator]();
        } else {
            iterator = [data][Symbol.iterator]();
        }

        return new Readable({
            objectMode: true,
            async read() {
                while (true) {
                    const it = await iterator.next();

                    if (it.done) {
                        this.push(null);
                        break;
                    } else {
                        if (!isObject(it.value)) {
                            throw new Error(`Only object inputs are allowed, got '${getType(it.value)}'.`);
                        }

                        const que = createInterface(clone(it.value), [...handlers]);
                        const queResults = await que.consume();

                        if (queResults.length > 0) {
                            for (const r of queResults) {
                                this.push(r);
                            }
                            break;
                        }
                    }
                }
            }
        });
    };

    return fn;
}

/**
 * Creates multiple branches from the data objects, each branch starting with one of the input function prepended.
 */
export function branch<Data extends object = any, Base extends object = {}>(
    ...args: HandlerArg<Api<Base, Data>, Data>[]
): HandlerComposition<Base, Data>;
export function branch<Data extends object = any, Base extends object = {}>(
    ...args: HandlerArg<Api<Base, Data>, Data>[]
): InternalHandlerComposition<Base, Data> {
    const handlers = flattenHandlers(args);
    const fn = async function (data) {
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
    } as InternalHandlerComposition<Base, Data>;

    fn.stream = function (data: DataArg<Data>): Readable {
        let iterator: Iterator<Data> | AsyncIterator<Data>;
        if (isIterable(data)) {
            iterator = data[Symbol.iterator]();
        } else if (isAsyncIterable(data)) {
            iterator = data[Symbol.asyncIterator]();
        } else {
            iterator = [data][Symbol.iterator]();
        }

        return new Readable({
            objectMode: true,
            async read() {
                while (true) {
                    const it = await iterator.next();

                    if (it.done) {
                        this.push(null);
                        break;
                    } else {
                        if (!isObject(it.value)) {
                            throw new Error(`Only object inputs are allowed, got '${getType(it.value)}'.`);
                        }

                        const results: Data[] = [];
                        for (const handler of handlers) {
                            const que = createInterface(clone(it.value), [handler]);
                            const queResults = await que.consume();
                            Array.prototype.push.apply(results, queResults);
                        }

                        if (results.length > 0) {
                            for (const r of results) {
                                this.push(r);
                            }
                            break;
                        }
                    }
                }
            }
        });
    };

    return fn;
}

/**
 * Executes all handlers simultaneously on the data.
 * The goal here is to speed up tasks that can work well asynchronously, like database or HTTP requests.
 *
 * __Use with caution!__
 *
 * Handlers are started parallel but their results are processed in series
 * (the same way as `series()` would do).
 *
 * Avoid `.rebase(data)` calls in a parallel handler; it could have unpredictable
 * results if more than one handler tries to rebase.
 */
export function parallel<Data extends object = any, Base extends object = {}>(
    ...args: HandlerArg<Api<Base, Data>, Data>[]
): HandlerComposition<Base, Data>;
export function parallel<Data extends object = any, Base extends object = {}>(
    ...args: HandlerArg<Api<Base, Data>, Data>[]
): InternalHandlerComposition<Base, Data> {
    const handlers = flattenHandlers(args);
    const fn = async function (data) {
        if (isApi<Base, Data>(this)) {
            const api = this;
            const internals = api[internalsSymbol];

            let pendingHandlerCallbacks: Handler<Api<Base, Data>, Data>[];
            try {
                pendingHandlerCallbacks = handlers
                    .map(handler => {
                        const pendingHandler = handler.call(api, internals.data);
                        return () => pendingHandler;
                    });
            } catch (error) {
                throw new HandlerError(error, internals.data);
            }

            this.next(pendingHandlerCallbacks);
        } else {
            const results: Data[] = [];
            const forAwaitOfIterableData = isIterable(data) || isAsyncIterable(data) ? data : [data];
            for await (const d of forAwaitOfIterableData) {
                if (!isObject(d)) {
                    throw new Error(`Only object inputs are allowed, got '${getType(d)}'.`);
                }

                const internals = createInterface<Data, Base>(clone(d), []);
                const api = internals.api;

                let pendingHandlerCallbacks: Handler<Api<Base, Data>, Data>[];
                try {
                    pendingHandlerCallbacks = handlers
                        .map(handler => {
                            const pendingHandler = handler.call(api, internals.data);
                            return () => pendingHandler;
                        });
                } catch (error) {
                    throw new HandlerError(error, internals.data);
                }

                api.next(pendingHandlerCallbacks);

                const queResults = await internals.consume();
                Array.prototype.push.apply(results, queResults);
            }
            return results;
        }
    } as InternalHandlerComposition<Base, Data>;

    fn.stream = function (data: DataArg<Data>): Readable {
        let iterator: Iterator<Data> | AsyncIterator<Data>;
        if (isIterable(data)) {
            iterator = data[Symbol.iterator]();
        } else if (isAsyncIterable(data)) {
            iterator = data[Symbol.asyncIterator]();
        } else {
            iterator = [data][Symbol.iterator]();
        }

        return new Readable({
            objectMode: true,
            async read() {
                while (true) {
                    const it = await iterator.next();

                    if (it.done) {
                        this.push(null);
                        break;
                    } else {
                        if (!isObject(it.value)) {
                            throw new Error(`Only object inputs are allowed, got '${getType(it.value)}'.`);
                        }

                        const internals = createInterface<Data, Base>(clone(it.value), []);
                        const api = internals.api;

                        let pendingHandlerCallbacks: Handler<Api<Base, Data>, Data>[];
                        try {
                            pendingHandlerCallbacks = handlers
                                .map(handler => {
                                    const pendingHandler = handler.call(api, internals.data);
                                    return () => pendingHandler;
                                });
                        } catch (error) {
                            throw new HandlerError(error, internals.data);
                        }

                        api.next(pendingHandlerCallbacks);

                        const queResults = await internals.consume();

                        if (queResults.length > 0) {
                            for (const r of queResults) {
                                this.push(r);
                            }
                            break;
                        }
                    }
                }
            }
        });
    };

    return fn;
}
