/*!
 * tque <https://github.com/lionel87/tque>
 *
 * Copyright (c) 2021, László BULIK.
 * Released under the MPL-2.0 License.
 */
/// <reference types="node" />
import { Readable } from 'stream';
import { HandlerError } from './handler-error';
export { HandlerError };
declare const internalsSymbol: unique symbol;
export declare const symbols: {
    detachedObject: symbol;
    internals: symbol;
};
export declare type Handler<ThisArg, Data> = {
    (this: ThisArg, data: Data): HandlerResult<Data> | Promise<HandlerResult<Data>>;
};
declare type HandlerResult<Data> = void | undefined | null | boolean | Data | Promise<void | undefined | null | boolean | Data> | (void | undefined | null | boolean | Data | Promise<void | undefined | null | boolean | Data>)[];
declare type HandlerArg<ThisArg, Data> = Handler<ThisArg, Data> | Iterable<Handler<ThisArg, Data>>;
declare type DataArg<Data> = Data | Iterable<Data> | AsyncIterable<Data>;
declare type HandlerComposition<Base, Data> = {
    (this: Api<Base, Data> | void, data: DataArg<Data>): Promise<Data[]>;
    stream(data: DataArg<Data>): Readable;
};
declare type BranchApi<Base, Data> = {
    api: Api<Base, Data>;
    que: Handler<Api<Base, Data>, Data>[];
    data: Data;
    childBranches: BranchApi<Base, Data>[];
    branch(data?: Data): BranchApi<Base, Data>;
    consume(): Promise<Data[]>;
};
export declare type Api<Base, Data> = {
    [internalsSymbol]: BranchApi<Base, Data>;
    series: {
        <Data extends object = any, Base extends object = {}>(...args: HandlerArg<Api<Base, Data>, Data>[]): {
            (this: Api<Base, Data>, data: DataArg<Data>): Promise<Data[]>;
        };
    };
    parallel: {
        <Data extends object = any, Base extends object = {}>(...args: HandlerArg<Api<Base, Data>, Data>[]): {
            (this: Api<Base, Data>, data: DataArg<Data>): Promise<Data[]>;
        };
    };
    branch: {
        <Data extends object = any, Base extends object = {}>(...args: HandlerArg<Api<Base, Data>, Data>[]): {
            (this: Api<Base, Data>, data: DataArg<Data>): Promise<Data[]>;
        };
    };
    next(...args: (Handler<Api<Base, Data>, Data> | Handler<Api<Base, Data>, Data>[])[]): Api<Base, Data>;
    push(...args: (Handler<Api<Base, Data>, Data> | Handler<Api<Base, Data>, Data>[])[]): Api<Base, Data>;
    rebase(data: Data): void;
    detached(data: Data): Data;
} & Base;
/**
 * Low level api to create a new que/branch.
 */
export declare function createInterface<Data extends object = any, Base extends object = {}>(data: Data, que?: Handler<Api<Base, Data>, Data>[], base?: Base): BranchApi<Base, Data>;
/**
 * Helper method to create a new que with a single handler function.
 */
export declare function create<Data extends object = any>(handler: Handler<Api<{}, Data>, Data>): {
    (data: DataArg<Data>): Promise<Data[]>;
    stream(data: DataArg<Data>): Readable;
};
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
export declare function createWithContext<Data extends object = any, Base extends object = {}>(thisArg: Base, handler: Handler<Api<Base, Data>, Data>): {
    (data: DataArg<Data>): Promise<Data[]>;
    stream(data: DataArg<Data>): Readable;
};
/**
 * Queue handler functions and execute them in series.
 */
export declare function series<Data extends object = any, Base extends object = {}>(...args: HandlerArg<Api<Base, Data>, Data>[]): HandlerComposition<Base, Data>;
/**
 * Creates multiple branches from the data objects, each branch starting with one of the input function prepended.
 */
export declare function branch<Data extends object = any, Base extends object = {}>(...args: HandlerArg<Api<Base, Data>, Data>[]): HandlerComposition<Base, Data>;
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
export declare function parallel<Data extends object = any, Base extends object = {}>(...args: HandlerArg<Api<Base, Data>, Data>[]): HandlerComposition<Base, Data>;
