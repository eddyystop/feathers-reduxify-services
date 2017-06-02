
/* eslint no-var: 0 */

const assert = require('chai').assert;
const feathersFakes = require('feathers-tests-fake-app-users');
const reduxifyServices = require('../lib').default;

const usersDb = [];

describe('reduxify:reducer - array of paths', () => {
  var db;
  var app;
  var users;
  var services;

  beforeEach(() => {
    db = clone(usersDb);
    app = feathersFakes.app();
    users = feathersFakes.makeDbService(app, 'users', db);
    app.use('users', users);
    services = reduxifyServices(app, ['users']);
  });

  it('has a reducer', () => {
    assert.isFunction(services.users.reducer);
  });

  it('returns an initial state', () => {
    const state = services.users.reducer(undefined, '@@INIT'); // action type Redux uses during init
    assert.isObject(state);
    assert.deepEqual(state, {
      data: [],
      requests: {},
    });
  });

  ['find', 'get', 'create', 'update', 'patch', 'remove'].forEach(method => {
    let lastState = { data: [], requests: {} };
    describe(`returns expected state for ${method}`, () => {
      ['pending', 'fulfilled'].forEach(step => {
        it(`for ${step}`, () => {
          const validStates = getValidStates(method === 'get' || method === 'find', method === 'remove');
          lastState = services.users.reducer(lastState,
                    reducerActionType(method, step));
          assert.deepEqual(lastState, validStates[step]);
        });
      });
    });
  });

  ['find', 'get', 'create', 'update', 'patch', 'remove'].forEach(method => {
    let lastState = { data: [], requests: {} };
    describe(`returns expected state for ${method}`, () => {
      ['pending', 'rejected'].forEach(step => {
        it(`for ${step}`, () => {
          const validStates = getValidStates(method === 'get' || method === 'find', method === 'remove');
          lastState = services.users.reducer(lastState,
                reducerActionType(method, step));
          assert.deepEqual(lastState, validStates[step]);
        });
      });
    });
  });

  describe('for reset', () => {
    it('resets state', () => {
      const state = services.users.reducer({}, services.users.reset());
      assert.deepEqual(state, {
        data: [],
        requests: {},
      });
    });

    it('does not reset on isLoading', () => {
      const state = services.users.reducer({ requests: { rid: { isLoading: true } } },
          services.users.reset());
      assert.deepEqual(state, { requests: { rid: { isLoading: true } } });
    });

    it('does not reset on isSaving', () => {
      const state = services.users.reducer({ requests: { rid: { isSaving: true } } },
          services.users.reset());
      assert.deepEqual(state, { requests: { rid: { isSaving: true } } });
    });

    it('resets data & requests by default', () => {
      const state = services.users.reducer(
        { data: [{ a: 'a' }] }, services.users.reset()
      );
      assert.deepEqual(state, {
        data: [],
        requests: {},
      });
    });

    it('does not reset data on truthy', () => {
      const state = services.users.reducer(
        { data: [{ a: 'a' }] }, services.users.reset(true)
      );
      assert.deepEqual(state, {
        data: [{ a: 'a' }],
        requests: {},
      });
    });
  });
});

describe('reduxify:reducer - single path', () => {
  var db;
  var app;
  var users;
  var services;

  beforeEach(() => {
    db = clone(usersDb);
    app = feathersFakes.app();
    users = feathersFakes.makeDbService(app, 'users', db);
    app.use('users', users);
    services = reduxifyServices(app, 'users');
  });

  it('has a reducer', () => {
    assert.isFunction(services.users.reducer);
  });

  it('returns an initial state', () => {
    const state = services.users.reducer(undefined, '@@INIT'); // action type Redux uses during init
    assert.isObject(state);
    assert.deepEqual(state, {
      data: [],
      requests: {},
    });
  });
});

describe('reduxify:reducer - path & convenience name', () => {
  var db;
  var app;
  var users;
  var services;

  beforeEach(() => {
    db = clone(usersDb);
    app = feathersFakes.app();
    users = feathersFakes.makeDbService(app, 'users', db);
    app.use('/users:slug', users);
    services = reduxifyServices(app, { '/users:slug': 'users' });
  });

  it('has a reducer', () => {
    assert.isFunction(services.users.reducer);
  });

  it('returns an initial state', () => {
    const state = services.users.reducer(undefined, '@@INIT'); // action type Redux uses during init
    assert.isObject(state);
    assert.deepEqual(state, {
      data: [],
      requests: {},
    });
  });
});

// Helpers

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const transferedPayload = { id: 'id', a: 'a' };

function reducerActionType(method, step) {
  return {
    type: `SERVICES_USERS_${method.toUpperCase()}_${step.toUpperCase()}`,
    payload: transferedPayload,
    meta: { query: 'query', rid: 'rid' },
  };
}

function getValidStates(ifLoading, ifRemove) {
  return {
    pending: {
      data: [],
      requests: {
        rid: {
          isError: null,
          isLoading: ifLoading,
          isSaving: !ifLoading,
          isFinished: false,
          query: 'query',
        },
      },
    },
    fulfilled: {
      data: (ifRemove ? [] : [transferedPayload]),
      requests: {
        rid: {
          isError: null,
          isLoading: false,
          isSaving: false,
          isFinished: true,
          query: 'query',
          result: ['id'],
        },
      },
    },
    rejected: {
      data: [],
      requests: {
        rid: {
          isError: transferedPayload,
          isLoading: false,
          isSaving: false,
          isFinished: true,
          query: 'query',
        },
      },
    },
  };
}
