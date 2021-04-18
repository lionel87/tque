export declare class HandlerError<T extends object = any> extends Error {
    readonly parent: Error;
    readonly data: T;
    readonly handler?: Function | undefined;
    constructor(parent: Error, data: T, handler?: Function | undefined);
}
