const internalsSymbol = Symbol('internals');

let internals, services, data, defaultServices, branch;

services = {
    [internalsSymbol]: internals,
};

internals = {
    data: {},
    services,
    branch: 0,
    que: 0,
    childBranches: 0,
    consume: 0,
};

defaultServices = {
    series: 0,
    parallel: 0,
    branch: 0,
    next: 0,
    push: 0,
    rebase: 0,
    detached: 0,
};
