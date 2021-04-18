export class HandlerError<T extends object = any> extends Error {
    constructor(
        public readonly parent: Error,
        public readonly data: T,
        public readonly handler?: Function,
    ) {
        super(parent?.message ?? Object.prototype.toString.call(parent));
        this.name = 'HandlerError';
        this.stack = parent.stack;
        
        // (<any>Error).captureStackTrace?.(this, HandlerError);
    }
}
