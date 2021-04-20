'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var stream = require('stream');

function createCommonjsModule(fn) {
  var module = { exports: {} };
	return fn(module, module.exports), module.exports;
}

/*!
 * assign-symbols <https://github.com/jonschlinkert/assign-symbols>
 *
 * Copyright (c) 2015-present, Jon Schlinkert.
 * Licensed under the MIT License.
 */

const toString$1 = Object.prototype.toString;
const isEnumerable = Object.prototype.propertyIsEnumerable;
const getSymbols = Object.getOwnPropertySymbols;

var assignSymbols = (target, ...args) => {
  if (!isObject$1(target)) {
    throw new TypeError('expected the first argument to be an object');
  }

  if (args.length === 0 || typeof Symbol !== 'function' || typeof getSymbols !== 'function') {
    return target;
  }

  for (let arg of args) {
    let names = getSymbols(arg);

    for (let key of names) {
      if (isEnumerable.call(arg, key)) {
        target[key] = arg[key];
      }
    }
  }
  return target;
};

function isObject$1(val) {
  return typeof val === 'function' || toString$1.call(val) === '[object Object]' || Array.isArray(val);
}

/*!
 * assign-deep <https://github.com/jonschlinkert/assign-deep>
 *
 * Copyright (c) 2017-present, Jon Schlinkert.
 * Released under the MIT License.
 */

var assignDeep = createCommonjsModule(function (module) {

const toString = Object.prototype.toString;


const isValidKey = key => {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
};

const assign = module.exports = (target, ...args) => {
  let i = 0;
  if (isPrimitive(target)) target = args[i++];
  if (!target) target = {};
  for (; i < args.length; i++) {
    if (isObject(args[i])) {
      for (const key of Object.keys(args[i])) {
        if (isValidKey(key)) {
          if (isObject(target[key]) && isObject(args[i][key])) {
            assign(target[key], args[i][key]);
          } else {
            target[key] = args[i][key];
          }
        }
      }
      assignSymbols(target, args[i]);
    }
  }
  return target;
};

function isObject(val) {
  return typeof val === 'function' || toString.call(val) === '[object Object]';
}

function isPrimitive(val) {
  return typeof val === 'object' ? val === null : typeof val !== 'function';
}
});

var toString = Object.prototype.toString;

var kindOf = function kindOf(val) {
  if (val === void 0) return 'undefined';
  if (val === null) return 'null';

  var type = typeof val;
  if (type === 'boolean') return 'boolean';
  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'symbol') return 'symbol';
  if (type === 'function') {
    return isGeneratorFn(val) ? 'generatorfunction' : 'function';
  }

  if (isArray(val)) return 'array';
  if (isBuffer(val)) return 'buffer';
  if (isArguments(val)) return 'arguments';
  if (isDate(val)) return 'date';
  if (isError(val)) return 'error';
  if (isRegexp(val)) return 'regexp';

  switch (ctorName(val)) {
    case 'Symbol': return 'symbol';
    case 'Promise': return 'promise';

    // Set, Map, WeakSet, WeakMap
    case 'WeakMap': return 'weakmap';
    case 'WeakSet': return 'weakset';
    case 'Map': return 'map';
    case 'Set': return 'set';

    // 8-bit typed arrays
    case 'Int8Array': return 'int8array';
    case 'Uint8Array': return 'uint8array';
    case 'Uint8ClampedArray': return 'uint8clampedarray';

    // 16-bit typed arrays
    case 'Int16Array': return 'int16array';
    case 'Uint16Array': return 'uint16array';

    // 32-bit typed arrays
    case 'Int32Array': return 'int32array';
    case 'Uint32Array': return 'uint32array';
    case 'Float32Array': return 'float32array';
    case 'Float64Array': return 'float64array';
  }

  if (isGeneratorObj(val)) {
    return 'generator';
  }

  // Non-plain objects
  type = toString.call(val);
  switch (type) {
    case '[object Object]': return 'object';
    // iterators
    case '[object Map Iterator]': return 'mapiterator';
    case '[object Set Iterator]': return 'setiterator';
    case '[object String Iterator]': return 'stringiterator';
    case '[object Array Iterator]': return 'arrayiterator';
  }

  // other
  return type.slice(8, -1).toLowerCase().replace(/\s/g, '');
};

function ctorName(val) {
  return typeof val.constructor === 'function' ? val.constructor.name : null;
}

function isArray(val) {
  if (Array.isArray) return Array.isArray(val);
  return val instanceof Array;
}

function isError(val) {
  return val instanceof Error || (typeof val.message === 'string' && val.constructor && typeof val.constructor.stackTraceLimit === 'number');
}

function isDate(val) {
  if (val instanceof Date) return true;
  return typeof val.toDateString === 'function'
    && typeof val.getDate === 'function'
    && typeof val.setDate === 'function';
}

function isRegexp(val) {
  if (val instanceof RegExp) return true;
  return typeof val.flags === 'string'
    && typeof val.ignoreCase === 'boolean'
    && typeof val.multiline === 'boolean'
    && typeof val.global === 'boolean';
}

function isGeneratorFn(name, val) {
  return ctorName(name) === 'GeneratorFunction';
}

function isGeneratorObj(val) {
  return typeof val.throw === 'function'
    && typeof val.return === 'function'
    && typeof val.next === 'function';
}

function isArguments(val) {
  try {
    if (typeof val.length === 'number' && typeof val.callee === 'function') {
      return true;
    }
  } catch (err) {
    if (err.message.indexOf('callee') !== -1) {
      return true;
    }
  }
  return false;
}

/**
 * If you need to support Safari 5-7 (8-10 yr-old browser),
 * take a look at https://github.com/feross/is-buffer
 */

function isBuffer(val) {
  if (val.constructor && typeof val.constructor.isBuffer === 'function') {
    return val.constructor.isBuffer(val);
  }
  return false;
}

/*!
 * shallow-clone <https://github.com/jonschlinkert/shallow-clone>
 *
 * Copyright (c) 2015-present, Jon Schlinkert.
 * Released under the MIT License.
 */

const valueOf = Symbol.prototype.valueOf;


function clone(val, deep) {
  switch (kindOf(val)) {
    case 'array':
      return val.slice();
    case 'object':
      return Object.assign({}, val);
    case 'date':
      return new val.constructor(Number(val));
    case 'map':
      return new Map(val);
    case 'set':
      return new Set(val);
    case 'buffer':
      return cloneBuffer(val);
    case 'symbol':
      return cloneSymbol(val);
    case 'arraybuffer':
      return cloneArrayBuffer(val);
    case 'float32array':
    case 'float64array':
    case 'int16array':
    case 'int32array':
    case 'int8array':
    case 'uint16array':
    case 'uint32array':
    case 'uint8clampedarray':
    case 'uint8array':
      return cloneTypedArray(val);
    case 'regexp':
      return cloneRegExp(val);
    case 'error':
      return Object.create(val);
    default: {
      return val;
    }
  }
}

function cloneRegExp(val) {
  const flags = val.flags !== void 0 ? val.flags : (/\w+$/.exec(val) || void 0);
  const re = new val.constructor(val.source, flags);
  re.lastIndex = val.lastIndex;
  return re;
}

function cloneArrayBuffer(val) {
  const res = new val.constructor(val.byteLength);
  new Uint8Array(res).set(new Uint8Array(val));
  return res;
}

function cloneTypedArray(val, deep) {
  return new val.constructor(val.buffer, val.byteOffset, val.length);
}

function cloneBuffer(val) {
  const len = val.length;
  const buf = Buffer.allocUnsafe ? Buffer.allocUnsafe(len) : Buffer.from(len);
  val.copy(buf);
  return buf;
}

function cloneSymbol(val) {
  return valueOf ? Object(valueOf.call(val)) : {};
}

/**
 * Expose `clone`
 */

var shallowClone = clone;

/*!
 * isobject <https://github.com/jonschlinkert/isobject>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

var isobject = function isObject(val) {
  return val != null && typeof val === 'object' && Array.isArray(val) === false;
};

/*!
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */



function isObjectObject(o) {
  return isobject(o) === true
    && Object.prototype.toString.call(o) === '[object Object]';
}

var isPlainObject = function isPlainObject(o) {
  var ctor,prot;

  if (isObjectObject(o) === false) return false;

  // If has modified constructor
  ctor = o.constructor;
  if (typeof ctor !== 'function') return false;

  // If has modified prototype
  prot = ctor.prototype;
  if (isObjectObject(prot) === false) return false;

  // If constructor does not have an Object-specific method
  if (prot.hasOwnProperty('isPrototypeOf') === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
};

/**
 * Module dependenices
 */





function cloneDeep(val, instanceClone) {
  switch (kindOf(val)) {
    case 'object':
      return cloneObjectDeep(val, instanceClone);
    case 'array':
      return cloneArrayDeep(val, instanceClone);
    default: {
      return shallowClone(val);
    }
  }
}

function cloneObjectDeep(val, instanceClone) {
  if (typeof instanceClone === 'function') {
    return instanceClone(val);
  }
  if (instanceClone || isPlainObject(val)) {
    const res = new val.constructor();
    for (let key in val) {
      res[key] = cloneDeep(val[key], instanceClone);
    }
    return res;
  }
  return val;
}

function cloneArrayDeep(val, instanceClone) {
  const res = new val.constructor(val.length);
  for (let i = 0; i < val.length; i++) {
    res[i] = cloneDeep(val[i], instanceClone);
  }
  return res;
}

/**
 * Expose `cloneDeep`
 */

var cloneDeep_1 = cloneDeep;

class HandlerError extends Error {
    constructor(parent, data, handler) {
        var _a;
        super((_a = parent === null || parent === void 0 ? void 0 : parent.message) !== null && _a !== void 0 ? _a : Object.prototype.toString.call(parent));
        this.parent = parent;
        this.data = data;
        this.handler = handler;
        this.name = 'HandlerError';
        this.stack = parent.stack;
        // (<any>Error).captureStackTrace?.(this, HandlerError);
    }
}

/*!
 * tque <https://github.com/lionel87/tque>
 *
 * Copyright (c) 2021, László BULIK.
 * Released under the MPL-2.0 License.
 */
const detachedObjectSymbol = Symbol('__detachedObjectMode');
const internalsSymbol = Symbol('__internals');
const symbols = {
    detachedObject: detachedObjectSymbol,
    internals: internalsSymbol,
};
const isIterable = (arg) => arg && typeof arg[Symbol.iterator] === 'function';
const isAsyncIterable = (arg) => arg && typeof arg[Symbol.asyncIterator] === 'function';
const isApi = (arg) => arg && typeof arg[internalsSymbol] === 'object';
const isHandler = (arg) => typeof arg === 'function';
const isObject = (arg) => !!arg && typeof arg === 'object';
const getType = (arg) => typeof arg === 'object' ? (arg ? 'object' : 'null') : (typeof arg);
function flattenHandlers(args) {
    const result = [];
    for (let arg of args) {
        let iterableArg;
        if (isIterable(arg)) {
            iterableArg = arg;
        }
        else {
            iterableArg = [arg];
        }
        for (const a of iterableArg) {
            if (isHandler(a)) {
                result.push(a);
            }
        }
    }
    return result;
}
/**
 * Low level api to create a new que/branch.
 */
function createInterface(data, que = [], base) {
    const self = { que, data, childBranches: [] };
    // api visible to handler functions via 'this' arg.
    self.api = Object.assign({
        [internalsSymbol]: self,
        series,
        parallel,
        branch,
        next(...args) {
            Array.prototype.unshift.apply(self.que, flattenHandlers(args));
            return self.api;
        },
        push(...args) {
            Array.prototype.push.apply(self.que, flattenHandlers(args));
            return self.api;
        },
        rebase(data) {
            self.data = data;
        },
        detached(data) {
            data[detachedObjectSymbol] = true;
            return data;
        }
    }, (base || {}));
    // creates a new que for the provided data based on the current que state
    self.branch = (data) => {
        const branch = createInterface(data || cloneDeep_1(self.data), [...self.que], base);
        self.childBranches.unshift(branch);
        return branch;
    };
    // consumes the items of this que and return results in array
    self.consume = async () => {
        const queResult = [];
        let terminateWithoutResult = false;
        while (self.que.length > 0) {
            const handler = self.que.shift(); // que always have items here, so no undefined results.
            let results;
            try {
                results = await handler.call(self.api, self.data);
            }
            catch (error) {
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
                                if (result[detachedObjectSymbol]) { // do not merge
                                    delete result[detachedObjectSymbol];
                                    self.branch(result);
                                }
                                else { // please merge
                                    self.branch(assignDeep(cloneDeep_1(self.data), result));
                                }
                            }
                            else { // underlying data already modified; result is undefined, null, string, number, ...
                                self.branch(cloneDeep_1(self.data));
                            }
                        }
                        else {
                            // returned true in an array (eg: [..., true, ...])
                            // we branch the que (because the array), but true value signals the que end.
                            queResult.push(cloneDeep_1(self.data));
                        }
                    }
                }
                // handle possible return values
                if (result0 && typeof result0 === 'object') { // que continues ...
                    if (result0[detachedObjectSymbol]) { // do not merge
                        delete result0[detachedObjectSymbol];
                        self.data = result0;
                    }
                    else { // please merge
                        assignDeep(self.data, result0);
                    }
                }
                else if (result0 === true) { // que exits
                    break;
                }
                else if (result0 === false) { // que exits without result
                    terminateWithoutResult = true;
                    break;
                }
            }
            else { // empty array returned, exit without result
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
function create(handler) {
    return async function (data) {
        const results = [];
        const forAwaitOfIterableData = isIterable(data) || isAsyncIterable(data) ? data : [data];
        for await (const d of forAwaitOfIterableData) {
            if (!isObject(d)) {
                throw new Error(`Only object inputs are allowed, got '${getType(d)}'.`);
            }
            const que = createInterface(cloneDeep_1(d), [handler]);
            const queResults = await que.consume();
            Array.prototype.push.apply(results, queResults);
        }
        return results;
    };
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
function createWithContext(thisArg, handler) {
    return async function (data) {
        const results = [];
        const forAwaitOfIterableData = isIterable(data) || isAsyncIterable(data) ? data : [data];
        for await (const d of forAwaitOfIterableData) {
            if (!isObject(d)) {
                throw new Error(`Only object inputs are allowed, got '${getType(d)}'.`);
            }
            const que = createInterface(cloneDeep_1(d), [handler], thisArg);
            const queResults = await que.consume();
            Array.prototype.push.apply(results, queResults);
        }
        return results;
    };
}
function series(...args) {
    const handlers = flattenHandlers(args);
    const fn = async function (data) {
        if (isApi(this)) {
            // (A): called as part of an existing que.
            // use the existing branch to que up hanlers. do not return any result.
            this.next(handlers);
        }
        else {
            // (B): this is the initiator of a new que.
            // start a new branch, que the handlers, consume, then return result array.
            const results = [];
            const forAwaitOfIterableData = isIterable(data) || isAsyncIterable(data) ? data : [data]; // incl. array with promises
            for await (const d of forAwaitOfIterableData) {
                if (!isObject(d)) {
                    throw new Error(`Only object inputs are allowed, got '${getType(d)}'.`);
                }
                const que = createInterface(cloneDeep_1(d), [...handlers]);
                const queResults = await que.consume();
                Array.prototype.push.apply(results, queResults);
            }
            return results;
        }
    };
    fn.stream = function (data) {
        let iterator;
        if (isIterable(data)) {
            iterator = data[Symbol.iterator]();
        }
        else if (isAsyncIterable(data)) {
            iterator = data[Symbol.asyncIterator]();
        }
        else {
            iterator = [data][Symbol.iterator]();
        }
        return new stream.Readable({
            objectMode: true,
            async read() {
                while (true) {
                    const it = await iterator.next();
                    if (it.done) {
                        this.push(null);
                        break;
                    }
                    else {
                        if (!isObject(it.value)) {
                            throw new Error(`Only object inputs are allowed, got '${getType(it.value)}'.`);
                        }
                        const que = createInterface(cloneDeep_1(it.value), [...handlers]);
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
function branch(...args) {
    const handlers = flattenHandlers(args);
    const fn = async function (data) {
        if (isApi(this)) {
            for (let i = 1; i < handlers.length; i++) {
                const handler = handlers[i];
                this[internalsSymbol].branch().api.next(handler);
            }
            if (handlers.length > 0) {
                this.next(handlers[0]);
            }
        }
        else {
            const results = [];
            const forAwaitOfIterableData = isIterable(data) || isAsyncIterable(data) ? data : [data];
            for await (const d of forAwaitOfIterableData) {
                if (!isObject(d)) {
                    throw new Error(`Only object inputs are allowed, got '${getType(d)}'.`);
                }
                for (const handler of handlers) {
                    const que = createInterface(cloneDeep_1(d), [handler]);
                    const queResults = await que.consume();
                    Array.prototype.push.apply(results, queResults);
                }
            }
            return results;
        }
    };
    fn.stream = function (data) {
        let iterator;
        if (isIterable(data)) {
            iterator = data[Symbol.iterator]();
        }
        else if (isAsyncIterable(data)) {
            iterator = data[Symbol.asyncIterator]();
        }
        else {
            iterator = [data][Symbol.iterator]();
        }
        return new stream.Readable({
            objectMode: true,
            async read() {
                while (true) {
                    const it = await iterator.next();
                    if (it.done) {
                        this.push(null);
                        break;
                    }
                    else {
                        if (!isObject(it.value)) {
                            throw new Error(`Only object inputs are allowed, got '${getType(it.value)}'.`);
                        }
                        const results = [];
                        for (const handler of handlers) {
                            const que = createInterface(cloneDeep_1(it.value), [handler]);
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
function parallel(...args) {
    const handlers = flattenHandlers(args);
    const fn = async function (data) {
        if (isApi(this)) {
            const api = this;
            const internals = api[internalsSymbol];
            let pendingHandlerCallbacks;
            try {
                pendingHandlerCallbacks = handlers
                    .map(handler => {
                    const pendingHandler = handler.call(api, internals.data);
                    return () => pendingHandler;
                });
            }
            catch (error) {
                throw new HandlerError(error, internals.data);
            }
            this.next(pendingHandlerCallbacks);
        }
        else {
            const results = [];
            const forAwaitOfIterableData = isIterable(data) || isAsyncIterable(data) ? data : [data];
            for await (const d of forAwaitOfIterableData) {
                if (!isObject(d)) {
                    throw new Error(`Only object inputs are allowed, got '${getType(d)}'.`);
                }
                const internals = createInterface(cloneDeep_1(d), []);
                const api = internals.api;
                let pendingHandlerCallbacks;
                try {
                    pendingHandlerCallbacks = handlers
                        .map(handler => {
                        const pendingHandler = handler.call(api, internals.data);
                        return () => pendingHandler;
                    });
                }
                catch (error) {
                    throw new HandlerError(error, internals.data);
                }
                api.next(pendingHandlerCallbacks);
                const queResults = await internals.consume();
                Array.prototype.push.apply(results, queResults);
            }
            return results;
        }
    };
    fn.stream = function (data) {
        let iterator;
        if (isIterable(data)) {
            iterator = data[Symbol.iterator]();
        }
        else if (isAsyncIterable(data)) {
            iterator = data[Symbol.asyncIterator]();
        }
        else {
            iterator = [data][Symbol.iterator]();
        }
        return new stream.Readable({
            objectMode: true,
            async read() {
                while (true) {
                    const it = await iterator.next();
                    if (it.done) {
                        this.push(null);
                        break;
                    }
                    else {
                        if (!isObject(it.value)) {
                            throw new Error(`Only object inputs are allowed, got '${getType(it.value)}'.`);
                        }
                        const internals = createInterface(cloneDeep_1(it.value), []);
                        const api = internals.api;
                        let pendingHandlerCallbacks;
                        try {
                            pendingHandlerCallbacks = handlers
                                .map(handler => {
                                const pendingHandler = handler.call(api, internals.data);
                                return () => pendingHandler;
                            });
                        }
                        catch (error) {
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

exports.HandlerError = HandlerError;
exports.branch = branch;
exports.create = create;
exports.createInterface = createInterface;
exports.createWithContext = createWithContext;
exports.parallel = parallel;
exports.series = series;
exports.symbols = symbols;
