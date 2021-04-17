// Until I find a better way I use this file to inspect proper input-output type constraints by hand.

import { createWithContext, series, parallel, branch, create } from '../lib/index';

(async () => {

    type TestApi = { testFn(): any; };
    type TestData = { testKey: string };

    const api: TestApi = { testFn() { return 1; } };

    // this should be ok
    createWithContext<TestData, TestApi>(api, series(function(d){ this.testFn(); d.testKey; }));
    create<TestData>(series(series(function(d){ d.testKey; })));
    createWithContext<TestData, TestApi>(api, series(branch(parallel(series(function(d){ this.testFn(); d.testKey; })))))({ testKey: 'abc' });

    // should show errors
    createWithContext<TestData, TestApi>({}, series(function(d){ this.testFn(); d.testKey; }));
    createWithContext<TestData, TestApi>({}, series(function(d){ this.notExistingFn(); d.notExistingKey; }))({ x: 1 });

})();
