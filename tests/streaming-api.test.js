const { Readable, Writable } = require('stream');
const { create, createWithContext, series, parallel, branch } = require('../lib/index');

/**
 * @param {number} size 
 * @returns Readable stream.
 */
function createInputStream(size) {
    const inputArray = [];
    for (let i = 0; i < size; i++) {
        inputArray.push({ a: i });
    }

    return new Readable({
        objectMode: true,
        read() {
            this.push(inputArray.shift() || null);
        }
    });
}

/**
 * @param {any[]} buffer 
 * @returns Writable stream.
 */
function createOutputStream(buffer) {
    return new Writable({
        objectMode: true,
        write(chunk, encoding, callback) {
            buffer.push(chunk);
            callback();
        }
    });
}

test('streaming base functionality with create()', async () => {
    const result = [];
    const input = createInputStream(10);
    const output = createOutputStream(result);

    const expected = [
        { a: 0, b: 1 },
        { a: 1, b: 2 },
        { a: 2, b: 3 },
        { a: 3, b: 4 },
        { a: 4, b: 5 },
        { a: 5, b: 6 },
        { a: 6, b: 7 },
        { a: 7, b: 8 },
        { a: 8, b: 9 },
        { a: 9, b: 10 }
    ];

    create(({ a }) => ({ b: a + 1 })).stream(input).pipe(output).on('close', function () {
        expect(result).toStrictEqual(expected);
    });
});

test('streaming base functionality with createWithContext()', async () => {
    const result = [];
    const input = createInputStream(10);
    const output = createOutputStream(result);

    const expected = [
        { a: 0, b: 1 },
        { a: 1, b: 2 },
        { a: 2, b: 3 },
        { a: 3, b: 4 },
        { a: 4, b: 5 },
        { a: 5, b: 6 },
        { a: 6, b: 7 },
        { a: 7, b: 8 },
        { a: 8, b: 9 },
        { a: 9, b: 10 }
    ];

    createWithContext(
        {
            inc(n) { return n + 1; }
        },
        function ({ a }) {
            return {
                b: this.inc(a)
            };
        }
    )
    .stream(input)
    .pipe(output)
    .on('close', function () {
        expect(result).toStrictEqual(expected);
    });
});

test('streaming with series()', async () => {
    const result = [];
    const input = createInputStream(10);
    const output = createOutputStream(result);

    const expected = [
        { a: 0, b: 1, c: 1 },
        { a: 1, b: 2, c: 2 },
        { a: 2, b: 3, c: 3 },
        { a: 3, b: 4, c: 4 },
        { a: 4, b: 5, c: 5 },
        { a: 5, b: 6, c: 6 },
        { a: 6, b: 7, c: 7 },
        { a: 7, b: 8, c: 8 },
        { a: 8, b: 9, c: 9 },
        { a: 9, b: 10, c: 10 }
    ];

    const fn1 = ({ a }) => ({ b: a + 1 });
    const fn2 = ({ b }) => ({ c: b });

    series(fn1, fn2).stream(input).pipe(output).on('close', function () {
        expect(result).toStrictEqual(expected);
    });
});

test('streaming with parallel()', async () => {
    const result = [];
    const input = createInputStream(10);
    const output = createOutputStream(result);

    const expected = [
        { a: 0, b: 1, c: undefined },
        { a: 1, b: 2, c: undefined },
        { a: 2, b: 3, c: undefined },
        { a: 3, b: 4, c: undefined },
        { a: 4, b: 5, c: undefined },
        { a: 5, b: 6, c: undefined },
        { a: 6, b: 7, c: undefined },
        { a: 7, b: 8, c: undefined },
        { a: 8, b: 9, c: undefined },
        { a: 9, b: 10, c: undefined }
    ];

    const fn1 = ({ a }) => ({ b: a + 1 });
    const fn2 = ({ b }) => ({ c: b });

    parallel(fn1, fn2).stream(input).pipe(output).on('close', function () {
        expect(result).toStrictEqual(expected);
    });
});

test('streaming with branch()', async () => {
    const result = [];
    const input = createInputStream(10);
    const output = createOutputStream(result);

    const expected = [
        { a: 0, b: 1 },
        { a: 0, b: 1, c: undefined },
        { a: 1, b: 1 },
        { a: 1, b: 1, c: undefined },
        { a: 2, b: 1 },
        { a: 2, b: 1, c: undefined },
        { a: 3, b: 1 },
        { a: 3, b: 1, c: undefined },
        { a: 4, b: 1 },
        { a: 4, b: 1, c: undefined },
        { a: 5, b: 1 },
        { a: 5, b: 1, c: undefined },
        { a: 6, b: 1 },
        { a: 6, b: 1, c: undefined },
        { a: 7, b: 1 },
        { a: 7, b: 1, c: undefined },
        { a: 8, b: 1 },
        { a: 8, b: 1, c: undefined },
        { a: 9, b: 1 },
        { a: 9, b: 1, c: undefined }
    ];

    const fn1 = ({ a }) => ({ b: a + 1 });
    const fn2 = ({ b }) => ({ c: b });
    const fn3 = () => ({ b: 1 });

    series(
        branch(fn1, fn2),
        fn3
    )
    .stream(input)
    .pipe(output)
    .on('close', function () {
        expect(result).toStrictEqual(expected);
    });
});
