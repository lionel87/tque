export class HandlerError<T extends object = any> extends Error {
    constructor(
        public readonly data: T,
        public readonly handler: Function,
        ...params: any[]
    ) {
        super(...params);

        this.name = 'HandlerError';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, HandlerError);
        }
    }
}
