
/* eslint no-var: 0 */

const assert = require('chai').assert;
const feathersFakes = require('feathers-tests-fake-app-users');
const reduxifyServices = require('../lib').default;

const usersDb = [];

describe('reduxify:reducer', () => {
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
      isError: null,
      isLoading: false,
      isSaving: false,
      isFinished: false,
      data: null,
      queryResult: null,
    });
  });

  ['find', 'get', 'create', 'update', 'patch', 'remove'].forEach(method => {
    describe(`for ${method}`, () => {
      ['pending', 'fulfilled', 'rejected'].forEach(step => {
        it(`returns expected state for ${step}`, () => {
          var validStates = getValidStates(false);
          if (method === 'find') { validStates = getValidStates(true, true); }
          if (method === 'get') { validStates = getValidStates(true); }

          const state = services.users.reducer({}, reducerActionType(method, step));
          assert.deepEqual(state, validStates[step]);
        });
      });
    });
  });
});

// Helpers

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function reducerActionType(method, step) {
  return {
    type: `SERVICES_USERS_${method.toUpperCase()}_${step.toUpperCase()}`,
    payload: 'xxx',
  };
}

function getValidStates(ifLoading, isFind) {
  return {
    pending: {
      isError: null,
      isLoading: ifLoading,
      isSaving: !ifLoading,
      isFinished: false,
      data: null,
      queryResult: null,

    },
    fulfilled: {
      isError: null,
      isLoading: false,
      isSaving: false,
      isFinished: true,
      data: !isFind ? 'xxx' : null,
      queryResult: isFind ? 'xxx' : null,
    },
    rejected: {
      isError: 'xxx',
      isLoading: false,
      isSaving: false,
      isFinished: false,
      data: null,
      queryResult: null,
    },
  };
}
