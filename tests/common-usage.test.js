const { series, parallel, branch } = require('../lib/index');

test('series() base functionality', async () => {
    const f = series(
        d => { d.a += ' s1'; },
        d => { d.a += ' s2'; },
        d => { d.a += ' s3'; },
    );

    const r = await f({ a: 's0' });

    expect(r).toStrictEqual([{ a: 's0 s1 s2 s3' }]);
});

test('parallel() base functionality', async () => {
    const f = parallel(
        d => { d.a = 'a' },
        d => { d.b = 'b' },
    );

    const r = await f({ x: 1 });

    expect(r).toStrictEqual([{ a: 'a', b: 'b', x: 1 }]);
});

test('branch() base functionality', async () => {
    const f = branch(
        d => { d.a = 'a' },
        d => { d.b = 'b' },
    );

    const r = await f({ x: 1 });

    expect(r).toStrictEqual([{ a: 'a', x: 1 }, { b: 'b', x: 1 }]);
});

test('branch() in series() composition', async () => {
    const f = series(
        d => { d.y = 1 },
        branch(
            d => { d.a = 'a' },
            d => { d.b = 'b' },
        ),
        d => { d.z = 1 }
    );

    const r = await f({ x: 1 });

    expect(r).toStrictEqual([{ a: 'a', x: 1, y: 1, z: 1 }, { b: 'b', x: 1, y: 1, z: 1 }]);
});

test('series() in branch() composition', async () => {
    const f = branch(
        series(
            d => { d.a = 'a' },
            d => { d.y = 1 },
        ),
        series(
            d => { d.b = 'b' },
            d => { d.z = 1 }
        ),
    );

    const r = await f({ x: 1 });

    expect(r).toStrictEqual([{ a: 'a', x: 1, y: 1 }, { b: 'b', x: 1, z: 1 }]);
});

test('parallel() in series() composition', async () => {
    const f = series(
        d => { d.y = 1 },
        parallel(
            d => { d.a = 'a' },
            d => { d.b = 'b' },
        ),
        d => { d.z = 1 }
    );

    const r = await f({ x: 1 });

    expect(r).toStrictEqual([{ a: 'a', b: 'b', x: 1, y: 1, z: 1 }]);
});

test('series(), parallel(), branch(), should throw error when params are incorrect type', async () => {
    const f = series(d => {});
    const g = parallel(d => {});
    const h = branch(d => {});

    expect(() => f(null)).rejects.toThrow(Error);
    expect(() => g(1)).rejects.toThrow(Error);
    expect(() => h("hello")).rejects.toThrow(Error);
});
