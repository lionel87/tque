// Until I find a better way I use this file to inspect proper input-output type constraints by hand.

import { create, createWithContext, series, parallel, branch } from '../lib/index';

(async () => {

    type TestApi = { testFn(): any; };
    type TestData = { testKey: string };

    const api: TestApi = { testFn() { return 1; } };

    // this should be ok
    const cf1 = create<TestData>(series(series(function(d){ d.testKey; })));
    const cf2 = createWithContext<TestData, TestApi>(api, series(function(d){ this.testFn(); d.testKey; }));
    const cf3 = createWithContext<TestData, TestApi>(api, series(branch(parallel(series(function(d){ this.testFn(); d.testKey; })))));

    cf1({ testKey: 'abc' });
    cf2({ testKey: 'abc' });
    cf3({ testKey: 'abc' });

    // should show errors
    const cf4 = createWithContext<TestData, TestApi>({}, series(function(d){ this.testFn(); d.testKey; }));
    const cf5 = createWithContext<TestData, TestApi>({}, series(function(d){ this.notExistingFn(); d.notExistingKey; }));

    cf4({ x: 1 });
    cf5({ x: 1 });

})();
