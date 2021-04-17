const { createInterface } = require('../lib/index');

test('create a que and execute it', async () => {
    const q = createInterface({ x: 0 }, [(d => { d.x++; })]);
    const r = await q.consume();

    expect(r).toStrictEqual([{ x: 1 }]);
});

test('create a que and schedule new functions', async () => {
    const a = (d) => { d.a = d.x; d.x++; };
    const b = (d) => { d.b = d.x; d.x++; };
    const c = (d) => { d.c = d.x; d.x++; };
    const d = (d) => { d.d = d.x; d.x++; };
    const e = (d) => { d.e = d.x; d.x++; };

    function f() {
        this.push(c, d);
        this.next(a, b);
        this.push(e);
    }

    const q = createInterface({ x: 0 }, [f]);
    const r = await q.consume();

    expect(r).toStrictEqual([{ a: 0, b: 1, c: 2, d: 3, e: 4, x: 5 }]);
});

test('rebase() calls should replace current data', async () => {
    const a = (d) => { d.a = d.x; d.x++; };
    const b = (d) => { d.b = d.x; d.x++; };
    const c = function () { this.rebase({ x: 0 }); };
    const d = (d) => { d.d = d.x; d.x++; };
    const e = (d) => { d.e = d.x; d.x++; };

    function f() {
        this.push(c, d);
        this.next(a, b);
        this.push(e);
    }

    const q = createInterface({ x: 0 }, [f]);
    const r = await q.consume();

    expect(r).toStrictEqual([{ d: 0, e: 1, x: 2 }]);
});

test('detached() data should not be merged with base data', async () => {
    const a = (d) => { d.a = d.x; d.x++; };
    const b = (d) => { d.b = d.x; d.x++; };
    const c = function ({ x }) { return [{ c: x, x: x + 1 }, this.detached({ x: 0 })] };
    const d = (d) => { d.d = d.x; d.x++; };
    const e = (d) => { d.e = d.x; d.x++; };

    const q = createInterface({ x: 0 }, [a, b, c, d, e]);
    const r = await q.consume();

    expect(r).toStrictEqual([{ a: 0, b: 1, c: 2, d: 3, e: 4, x: 5 }, { d: 0, e: 1, x: 2 }]);
});
