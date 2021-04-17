const { series, parallel, branch } = require('../lib/index');

test('returning arrays in series()', async () => {
    const f = series(
        () => [{ a: 1 }, { b: 1 }],
        () => [{ c: 2 }, { d: 2 }],
    );

    const r = await f({ x: 0 });

    expect(r).toStrictEqual([{ x: 0, a: 1, c: 2 }, { x: 0, a: 1, d: 2 }, { x: 0, b: 1, c: 2 }, { x: 0, b: 1, d: 2 }]);
});

test('returning arrays in branch()', async () => {
    const f = branch(
        () => [{ a: 1 }, { b: 1 }],
        () => [{ c: 1 }, { d: 1 }],
    );

    const r = await f({ x: 0 });

    expect(r).toStrictEqual([{ x: 0, a: 1 }, { x: 0, b: 1 }, { x: 0, c: 1 }, { x: 0, d: 1 }]);
});

test('rebasing data', async () => {
    const f = branch(
        () => [{ a: 1 }, { b: 1 }],
        () => [{ c: 1 }, { d: 1 }],
    );

    const r = await f({ x: 0 });

    expect(r).toStrictEqual([{ x: 0, a: 1 }, { x: 0, b: 1 }, { x: 0, c: 1 }, { x: 0, d: 1 }]);
});

test('detaching data', async () => {
    const f = series(
        function () { return [{ a: 1 }, { b: 1 }] },
        function () { return [this.detached({ c: 1 }), this.detached({ d: 1 })] },
    );

    const r = await f({ x: 0 });

    expect(r).toStrictEqual([{ c: 1 }, { d: 1 }, { c: 1 }, { d: 1 }]);
});
