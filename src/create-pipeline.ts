import clone from 'clone-deep';
import assign from 'assign-deep';
import { HandlerError } from './handler-error';

export type Handler<Services, Data> = { (this: Services, data: Data): HandlerResult<Data> | Promise<HandlerResult<Data>> };

type HandlerResult<Data> = void | undefined | null | boolean | Data | Promise<void | undefined | null | boolean | Data> |
    (void | undefined | null | boolean | Data | Promise<void | undefined | null | boolean | Data>)[];

export const internalsSymbol = Symbol('__internals');
export const detachedObjectSymbol = Symbol('__detachedObjectMode');

export type Services<Base extends object, Data extends object> = InternalsRef<Base, Data> & Base;

type InternalsRef<Base extends object, Data extends object> = {
    [internalsSymbol]: Internals<Services<Base, Data>, Data>;
};

type Internals<Services extends object, Data extends object> = {
    services: Services;
    data: Data;
    handlers: Handler<Services, Data>[];
    children: Pipeline<Services, Data>[];
    branch(data?: Data): Pipeline<Services, Data>;
};

type Pipeline<Services extends object, Data extends object> = {
    internals: Internals<Services, Data>;
    consume(): Promise<Data[]>;
};

/**
 * Low level API to create a new que for handlers to be executed on one given data object.
 */
export function createPipeline<Services extends object, Data extends object>(
    data: Data,
    handlers: Handler<Services, Data>[],
    services?: Services
): Pipeline<Services, Data> {
    const internals = {
        handlers: handlers || [],
        data: data || {},
        children: [],
    } as unknown as Internals<Services, Data>;

    internals.services = Object.assign({ [internalsSymbol]: internals }, services);

    // creates a new que for the provided data based on the current que state
    internals.branch = (data?: Data): Pipeline<Services, Data> => {
        const branch = createPipeline<Services, Data>(
            data || clone(internals.data),
            [...internals.handlers],
            services,
        );
        internals.children.unshift(branch);
        return branch;
    };

    return {
        internals: internals,
        async consume(): Promise<Data[]> {
            const pipelineResult: Data[] = [];
            let terminateWithoutResult = false;

            while (internals.handlers.length > 0) {
                const handler = <Handler<Services, Data>>internals.handlers.shift(); // always have items

                let results: HandlerResult<Data>;
                try {
                    results = await handler.call(internals.services, internals.data);
                } catch (error) {
                    throw new HandlerError(error, internals.data, handler);
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
                                        internals.branch(result);
                                    } else { // please merge
                                        internals.branch(assign(clone(internals.data), result));
                                    }
                                } else { // underlying data already modified; result is undefined, null, string, number, ...
                                    internals.branch(clone(internals.data));
                                }
                            } else {
                                // returned true in an array (eg: [..., true, ...])
                                // we branch the que (because the array), but true value signals the que end.
                                pipelineResult.push(clone(internals.data));
                            }
                        }
                    }

                    // handle possible return values
                    if (result0 && typeof result0 === 'object') { // que continues ...
                        if ((<any>result0)[detachedObjectSymbol]) { // do not merge
                            delete (<any>result0)[detachedObjectSymbol];
                            internals.data = result0;
                        } else { // please merge
                            assign(internals.data, result0);
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
                pipelineResult.push(internals.data);
            }

            // at this point this que is empty
            // but we need to get results from the child ques too
            for (const branch of internals.children) {
                Array.prototype.push.apply(pipelineResult, await branch.consume());
            }

            return pipelineResult;
        }
    };
}

createPipeline().internals.branch
