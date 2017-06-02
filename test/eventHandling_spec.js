/* eslint max-len: 0, no-param-reassign: 0, no-underscore-dangle: 0, no-var: 0 */

const assert = require('chai').assert;
const _ = require('lodash');
const feathersFakes = require('feathers-tests-fake-app-users');
const reduxifyServices = require('../lib').default;
const automaticDispatchEvents = require('../lib').automaticDispatchEvents;

const usersDb = [
    { _id: 'a', email: 'a', isVerified: true, verifyToken: null, verifyExpires: null },
    { _id: 'b', email: 'b', isVerified: true, verifyToken: null, verifyExpires: null },
];

describe('reduxify:event-handling', () => {
  let db;
  let app;
  let users;
  let services;

  beforeEach(() => {
    db = clone(usersDb);
    app = feathersFakes.app();
    users = feathersFakes.makeDbService(app, 'users', db);
    app.use('users', users);
    services = reduxifyServices(app, ['users']);
  });

  it('has automaticDispatchEvents', () => {
    assert.isFunction(automaticDispatchEvents);
  });

  const EVENTS = [
    'created',
    'updated',
    'patched',
    'removed',
  ];
  const object = {
    id: 'id',
    email: 'abc123',
    isVerified: true,
    verifyToken: null,
    verifyExpires: null
  };

  describe('reduxify:action-creators', () => {
    describe('has action creator for', () => {
      EVENTS.forEach(event => {
        it(event, () => {
          assert.isFunction(services.users[event]);
          const action = services.users[event](object);
          assert.sameMembers(Object.keys(action), ['type', 'payload']);
          assert.equal(action.type, actionType(event));
          assert.equal(action.payload, object);
        });
      });
    });
  });

  describe('reduxify:reducer - array of paths', () => {
    EVENTS.forEach(event => {
      it(`returns expected state for ${event}`, () => {
        const validStates = getValidStates(object, event === 'removed');
        const newState = services.users.reducer(getValidStates(), reducerActionType(event, object));
        assert.deepEqual(newState, validStates);
      });
    });
  });

  describe('reduxify:automaticDispatchEvents - array of paths', () => {
    let cbFn;
    it('execute automatic event handler, without socket.io', () => {
      automaticDispatchEvents(app,
              ['users'],
              (...args) => { if (_.isFunction(cbFn)) { cbFn(args); } },
              services);
    });

    const eventHandler = {};

    it('execute automatic event handler, with socket.io', () => {
      app.service('users').on = (event, fn) => { eventHandler[event] = fn; };
      automaticDispatchEvents(app,
              ['users'],
              (...args) => { if (_.isFunction(cbFn)) { cbFn(args); } },
              services);
    });

    describe('emit events to check dispatching actions', () => {
      EVENTS.forEach(event => {
        it(`emit ${event} and receive action dispatch`, (done) => {
          cbFn = (action) => {
            assert.sameMembers(Object.keys(action[0]), ['type', 'payload']);
            const payload = action[0].payload;
            assert.isObject(payload);
            assert.deepEqual(payload, object);
            done();
          };
          assert.isFunction(eventHandler[event]);
          eventHandler[event](object);
        });
      });
    });
  });
});

// Helpers

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function actionType(event) {
  return (`SERVICES_USERS_${event.toUpperCase()}`);
}

function getValidStates(pObj, ifRemove) {
  return {
    data: !pObj || ifRemove ? [] : [pObj],
    requests: {},
  };
}

function reducerActionType(event, obj) {
  return {
    type: actionType(event),
    payload: obj,
  };
}
