
import { createAction, handleActions } from 'redux-actions';
import makeDebug from 'debug';
import _ from 'lodash';
import uuid from 'uuid';

/**
 * Build a Redux compatible wrapper around a Feathers service.
 *
 * Instead of using a feathers-client service directly
 *     app.services('messages').create({ name: 'John' }, (err, data) => {...});
 * you first wrap the feathers service to expose Redux action creators and a reducer
 *     messages = reduxifyService(app, 'messages');
 * You can thereafter use the service in a standard Redux manner
 *     store.dispatch(messages.create({ name: 'John' }));
 * with async action creators being dispatched to a reducer which manages state.
 *
 * @param {Object} app the configured Feathers app, e.g. require('feathers-client')().configure(...)
 * @param {String} route is the Feathers' route for the service.
 * @param {String} name is the serviceName by which the service is known on client. Default route.
 * @param {Object} options
 * @returns {{find: *, get: *, create: *, update: *, patch: *, remove: *, on: *, reducer: *}}
 *
 * You will usually use on the client
 *      const users = reduxifyService(app, 'users');
 * However you may sometimes have awkward REST paths on the server like
 *      app.use('app.use('/verifyReset/:action/:value', ...);
 * You are then best of to use on the client
 *      const buildings = reduxifyService(app, '/verifyReset/:action/:value', 'verifyReset');
 * since you can thereafter use
 *      store.dispatch(verifyReset.create(...));
 *
 * Action creators for service calls are returned as { find, get, create, update, patch, remove }.
 * They expect the same parameters as their Feathers service methods, e.g. (id, data, params).
 *
 * Should you wish to write additional action creators, the { reducer } export expects action types
 *   'SERVICES_${SERVICE_NAME}_${METHOD}_PENDING', ...FULFILLED and ...REJECTED
 * where SERVICE_NAME is serviceName in upper case; METHOD is FIND, GET, ...
 *
 * Pro tip: You can implement optimistic updates within ...PENDING, finalizing them in ...FULFILL.
 *
 * The reducer's JS state (not immutable) is {
 *   data: Array,
 *   requests: Object,
 * }.
 * Methods store in data, requests|Object for separation.
 *
 * The reducer's JS request (not immutable) is {
 *   isLoading: Boolean,
 *   isSaving: Boolean,
 *   isFinished: Boolean,
 *   isError: Object|null,
 *   result: Array|null,
 *   query: Object|null,
 * }.
 *
 * requests is an Object which returns id's from a request (data|Array)
 * or the error object { message, name, code, className, errors }.
 * If the feathers server response did not specify an error message, then the message property will
 * be feathers default of 'Error'.
 *
 * Options may change the state property names and the reducer action type names.
 *
 * Each service also gets a reset service call which re-initializes that service's state.
 *
 * An action creator for listening on service events is returned as { on } and could be used like:
 *   import feathersApp, { services } from './feathers';
 *   feathersApp.service('messages').on('created', data => { store.dispatch(
 *       services.messages.on('created', data, (event, data, dispatch, getState) => {
 *         // handle data change
 *       })
 *   ); });
 */
const reduxifyService = (app, route, name = route, options = {}) => {
  const debug = makeDebug(`reducer:${name}`);
  debug(`route ${route}`);

  const defaults = {
    isLoading: 'isLoading',
    isSaving: 'isSaving',
    isFinished: 'isFinished',
    isError: 'isError',
    data: 'data',
    query: 'query',
    result: 'result',
    requests: 'requests',
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    REJECTED: 'REJECTED',
  };
  const opts = Object.assign({}, defaults, options);
  const SERVICE_NAME = `SERVICES_${name.toUpperCase()}_`;


  const service = app.service(route);
  if (!service) {
    debug(`redux: Feathers service '${route} does not exist.`);
    throw Error(`Feathers service '${route} does not exist.`);
  }

  const reducerForServiceMessages = (actionType, isDelete) => ({
    [actionType]: (state, action) => {
      debug(`redux:${actionType}`, action);

      const arrayResult = (_.isArray(action.payload) ? action.payload : [action.payload]);
      const idField = _.has(arrayResult[0], 'id') ? 'id' : '_id';
      return {
        ...state,
        [opts.data]: isDelete ? _.filter(state[opts.data],
            (obj) => (_.map(arrayResult, (o) => o[idField]).indexOf(obj[idField]) === -1)) :
            _.unionBy(arrayResult, state[opts.data], idField),
      };
    }
  });

  const reducerForServiceMethod = (actionType, ifLoading) => ({
    // promise has been started
    [`${actionType}_${opts.PENDING}`]: (state, action) => {
      debug(`redux:${actionType}_${opts.PENDING}`, action);

      let request = {};
      request[action.meta.rid] = {
        [opts.isLoading]: ifLoading,
        [opts.isSaving]: !ifLoading,
        [opts.isFinished]: false,
        [opts.isError]: null,
        [opts.query]: action.meta.query,
      };

      return ({
        ...state,
        [opts.requests]: _.merge(state[opts.requests], request),
      });
    },

    // promise resolved
    [`${actionType}_${opts.FULFILLED}`]: (state, action) => {
      debug(`redux:${actionType}_${opts.FULFILLED}`, action);

      const arrayResult = (_.isArray(action.payload) ? action.payload : [action.payload]);
      const idField = _.has(arrayResult[0], 'id') ? 'id' : '_id';
      let request = {};
      request[action.meta.rid] = {
        id: action.meta.rid,
        [opts.isLoading]: false,
        [opts.isSaving]: false,
        [opts.isFinished]: true,
        [opts.isError]: null,
        [opts.result]: _.map(arrayResult, idField)
      };

      return {
        ...state,
        [opts.data]: _.unionBy(arrayResult, state[opts.data], idField),
        [opts.requests]: _.merge(state[opts.requests], request),
      };
    },

    // promise rejected
    [`${actionType}_${opts.REJECTED}`]: (state, action) => {
      debug(`redux:${actionType}_${opts.REJECTED}`, action);

      let request = {};
      request[action.meta.rid] = {
        [opts.isLoading]: false,
        [opts.isSaving]: false,
        [opts.isFinished]: true,
        [opts.isError]: action.payload
      };

      return {
        ...state,
        [opts.requests]: _.merge(state[opts.requests], request),
      };
    },
  });

  // ACTION TYPES
  const FIND = `${SERVICE_NAME}FIND`;
  const GET = `${SERVICE_NAME}GET`;
  const CREATE = `${SERVICE_NAME}CREATE`;
  const UPDATE = `${SERVICE_NAME}UPDATE`;
  const PATCH = `${SERVICE_NAME}PATCH`;
  const REMOVE = `${SERVICE_NAME}REMOVE`;
  const RESET = `${SERVICE_NAME}RESET`;

  return {
    // ACTION CREATORS
    // Note: action.payload in reducer will have the value of .data below
    find: createAction(FIND, (p) => ({ promise: service.find(p), data: undefined }),
        (p, rid) => ({ query: p, rid: (rid || uuid.v4()) })),
    get: createAction(GET, (id, p) => ({ promise: service.get(id, p) }),
        (id, p, rid) => ({ query: p, rid: (rid || uuid.v4()) })),
    create: createAction(CREATE, (d, p) => ({ promise: service.create(d, p) }),
        (d, p, rid) => ({ query: p, rid: (rid || uuid.v4()) })),
    update: createAction(UPDATE, (id, d, p) => ({ promise: service.update(id, d, p) }),
        (id, d, p, rid) => ({ query: p, rid: (rid || uuid.v4()) })),
    patch: createAction(PATCH, (id, d, p) => ({ promise: service.patch(id, d, p) }),
        (id, d, p, rid) => ({ query: p, rid: (rid || uuid.v4()) })),
    remove: createAction(REMOVE, (id, p) => ({ promise: service.remove(id, p) }),
        (id, p, rid) => ({ query: p, rid: (rid || uuid.v4()) })),
    reset: createAction(RESET),

    created: createAction(`${CREATE}D`, d => d),
    updated: createAction(`${UPDATE}D`, d => d),
    patched: createAction(`${PATCH}ED`, d => d),
    removed: createAction(`${REMOVE}D`, d => d),

    // on: (event, data, fcn) => (dispatch, getState) => { fcn(event, data, dispatch, getState); },

    // REDUCER
    reducer: handleActions(
      Object.assign({},
        reducerForServiceMethod(FIND, true),
        reducerForServiceMethod(GET, true),
        reducerForServiceMethod(CREATE, false),
        reducerForServiceMethod(UPDATE, false),
        reducerForServiceMethod(PATCH, false),
        reducerForServiceMethod(REMOVE, false),

        reducerForServiceMessages(`${CREATE}D`),
        reducerForServiceMessages(`${UPDATE}D`),
        reducerForServiceMessages(`${PATCH}ED`),
        reducerForServiceMessages(`${REMOVE}D`, true),

        // reset status if no promise is pending
        { [RESET]: (state, action) => {
          debug(`redux:${RESET}`, action);

          if (state[opts.isLoading] || state[opts.isSaving]) {
            return state;
          }

          return {
            ...state,
            [opts.data]: [],
            [opts.requests]: {},
          };
        } }
      ),
      {
        [opts.data]: [],
        [opts.requests]: {},
      }
    ),
  };
};

/**
 * Convenience method to build wrappers for multiple services. You should this not reduxifyService.
 *
 * @param {Object} app - See reduxifyService
 * @param {Object|Array|String} routeNameMap - The feathers services to reduxify. See below.
 * @param {Object} options - See reduxifyService
 * @returns {Object} Each services' action creators. See reduxifyService.
 *
 * If the feathers server has:
 *   app.use('users', ...);
 *   app.use('/buildings/:buildingid', ...);
 * then you can do
 *   services = reduxifyServices(app, { users: 'users', '/buildings/:buildingid': 'buildings' });
 *   ...
 *   store.dispatch(users.create(...));
 *   store.dispatch(users.create(...));
 *
 * A routeNameMap of ['users', 'members'] is the same as { users: 'users', members: 'members' }.
 * A routeNameMao of 'users' is the same as { users: 'users' }.
 */
export default (app, routeNameMap, options) => {
  const services = {};
  let routeNames = {};

  if (typeof routeNameMap === 'string') {
    routeNames = { [routeNameMap]: routeNameMap };
  } else if (Array.isArray(routeNameMap)) {
    routeNameMap.forEach(name => { routeNames[name] = name; });
  } else if (typeof routeNameMap === 'object') {
    routeNames = routeNameMap;
  }

  Object.keys(routeNames).forEach(route => {
    services[routeNames[route]] = reduxifyService(app, route, routeNames[route], options);
  });

  return services;
};

const EVENTS = [
  'created',
  'updated',
  'patched',
  'removed',
];

/**
 * Get a status to display as a summary of all Feathers services.
 *
 * The services are checked in serviceNames order.
 * The first service with an error message, returns that as the status.
 * Otherwise the first service loading or saving returns its status.
 *
 * @param {Object} app - See reduxifyService
 * @param {Object|Array|String} routeNameMap - The feathers services to reduxify. See default export function.
 * @param {function} dispatch - store.dispatch method
 * @param {Object} services - return value of default. See above.
 */
export const automaticDispatchEvents = (app, routeNameMap, dispatch, services) => {
  let routeNames = {};
  if (typeof routeNameMap === 'string') {
    routeNames = { [routeNameMap]: routeNameMap };
  } else if (Array.isArray(routeNameMap)) {
    routeNameMap.forEach(name => { routeNames[name] = name; });
  } else if (typeof routeNameMap === 'object') {
    routeNames = routeNameMap;
  }

  Object.keys(routeNames).forEach(route => {
    const debug = makeDebug(`event:${route}`);
    const service = app.service(route);
    EVENTS.forEach(event => {
      service.on(event, (data) => {
        debug(`event:${event}`, data);
        dispatch(services[routeNames[route]][event](data));
      });
    });
  });
};

