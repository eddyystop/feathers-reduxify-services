'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.automaticDispatchEvents = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _reduxActions = require('redux-actions');

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
var reduxifyService = function reduxifyService(app, route) {
  var _handleActions;

  var name = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : route;
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  var debug = (0, _debug2.default)('reducer:' + name);
  debug('route ' + route);

  var defaults = {
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
    REJECTED: 'REJECTED'
  };
  var opts = Object.assign({}, defaults, options);
  var SERVICE_NAME = 'SERVICES_' + name.toUpperCase() + '_';

  var service = app.service(route);
  if (!service) {
    debug('redux: Feathers service \'' + route + ' does not exist.');
    throw Error('Feathers service \'' + route + ' does not exist.');
  }

  var reducerForServiceMessages = function reducerForServiceMessages(actionType, isDelete) {
    return _defineProperty({}, actionType, function (state, action) {
      debug('redux:' + actionType, action);

      var arrayResult = _lodash2.default.isArray(action.payload) ? action.payload : [action.payload];
      var idField = _lodash2.default.has(arrayResult[0], 'id') ? 'id' : '_id';
      return _extends({}, state, _defineProperty({}, opts.data, isDelete ? _lodash2.default.filter(state[opts.data], function (obj) {
        return _lodash2.default.map(arrayResult, function (o) {
          return o[idField];
        }).indexOf(obj[idField]) === -1;
      }) : _lodash2.default.unionBy(arrayResult, state[opts.data], idField)));
    });
  };

  var reducerForServiceMethod = function reducerForServiceMethod(actionType, ifLoading) {
    var _ref2;

    return _ref2 = {}, _defineProperty(_ref2, actionType + '_' + opts.PENDING, function undefined(state, action) {
      var _request$action$meta$;

      debug('redux:' + actionType + '_' + opts.PENDING, action);

      var request = {};
      request[action.meta.rid] = (_request$action$meta$ = {}, _defineProperty(_request$action$meta$, opts.isLoading, ifLoading), _defineProperty(_request$action$meta$, opts.isSaving, !ifLoading), _defineProperty(_request$action$meta$, opts.isFinished, false), _defineProperty(_request$action$meta$, opts.isError, null), _defineProperty(_request$action$meta$, opts.query, action.meta.query), _request$action$meta$);

      return _extends({}, state, _defineProperty({}, opts.requests, _lodash2.default.merge(state[opts.requests], request)));
    }), _defineProperty(_ref2, actionType + '_' + opts.FULFILLED, function undefined(state, action) {
      var _request$action$meta$2, _extends4;

      debug('redux:' + actionType + '_' + opts.FULFILLED, action);

      var arrayResult = _lodash2.default.isArray(action.payload) ? action.payload : [action.payload];
      var idField = _lodash2.default.has(arrayResult[0], 'id') ? 'id' : '_id';
      var request = {};
      request[action.meta.rid] = (_request$action$meta$2 = {
        id: action.meta.rid
      }, _defineProperty(_request$action$meta$2, opts.isLoading, false), _defineProperty(_request$action$meta$2, opts.isSaving, false), _defineProperty(_request$action$meta$2, opts.isFinished, true), _defineProperty(_request$action$meta$2, opts.isError, null), _defineProperty(_request$action$meta$2, opts.result, _lodash2.default.map(arrayResult, idField)), _request$action$meta$2);

      return _extends({}, state, (_extends4 = {}, _defineProperty(_extends4, opts.data, _lodash2.default.unionBy(arrayResult, state[opts.data], idField)), _defineProperty(_extends4, opts.requests, _lodash2.default.merge(state[opts.requests], request)), _extends4));
    }), _defineProperty(_ref2, actionType + '_' + opts.REJECTED, function undefined(state, action) {
      var _request$action$meta$3;

      debug('redux:' + actionType + '_' + opts.REJECTED, action);

      var request = {};
      request[action.meta.rid] = (_request$action$meta$3 = {}, _defineProperty(_request$action$meta$3, opts.isLoading, false), _defineProperty(_request$action$meta$3, opts.isSaving, false), _defineProperty(_request$action$meta$3, opts.isFinished, true), _defineProperty(_request$action$meta$3, opts.isError, action.payload), _request$action$meta$3);

      return _extends({}, state, _defineProperty({}, opts.requests, _lodash2.default.merge(state[opts.requests], request)));
    }), _ref2;
  };

  // ACTION TYPES
  var FIND = SERVICE_NAME + 'FIND';
  var GET = SERVICE_NAME + 'GET';
  var CREATE = SERVICE_NAME + 'CREATE';
  var UPDATE = SERVICE_NAME + 'UPDATE';
  var PATCH = SERVICE_NAME + 'PATCH';
  var REMOVE = SERVICE_NAME + 'REMOVE';
  var RESET = SERVICE_NAME + 'RESET';

  return {
    // ACTION CREATORS
    // Note: action.payload in reducer will have the value of .data below
    find: (0, _reduxActions.createAction)(FIND, function (p) {
      return { promise: service.find(p), data: undefined };
    }, function (p, rid) {
      return { query: p, rid: rid || _uuid2.default.v4() };
    }),
    get: (0, _reduxActions.createAction)(GET, function (id, p) {
      return { promise: service.get(id, p) };
    }, function (id, p, rid) {
      return { query: p, rid: rid || _uuid2.default.v4() };
    }),
    create: (0, _reduxActions.createAction)(CREATE, function (d, p) {
      return { promise: service.create(d, p) };
    }, function (d, p, rid) {
      return { query: p, rid: rid || _uuid2.default.v4() };
    }),
    update: (0, _reduxActions.createAction)(UPDATE, function (id, d, p) {
      return { promise: service.update(id, d, p) };
    }, function (id, d, p, rid) {
      return { query: p, rid: rid || _uuid2.default.v4() };
    }),
    patch: (0, _reduxActions.createAction)(PATCH, function (id, d, p) {
      return { promise: service.patch(id, d, p) };
    }, function (id, d, p, rid) {
      return { query: p, rid: rid || _uuid2.default.v4() };
    }),
    remove: (0, _reduxActions.createAction)(REMOVE, function (id, p) {
      return { promise: service.remove(id, p) };
    }, function (id, p, rid) {
      return { query: p, rid: rid || _uuid2.default.v4() };
    }),
    reset: (0, _reduxActions.createAction)(RESET),

    created: (0, _reduxActions.createAction)(CREATE + 'D', function (d) {
      return d;
    }),
    updated: (0, _reduxActions.createAction)(UPDATE + 'D', function (d) {
      return d;
    }),
    patched: (0, _reduxActions.createAction)(PATCH + 'ED', function (d) {
      return d;
    }),
    removed: (0, _reduxActions.createAction)(REMOVE + 'D', function (d) {
      return d;
    }),

    // on: (event, data, fcn) => (dispatch, getState) => { fcn(event, data, dispatch, getState); },

    // REDUCER
    reducer: (0, _reduxActions.handleActions)(Object.assign({}, reducerForServiceMethod(FIND, true), reducerForServiceMethod(GET, true), reducerForServiceMethod(CREATE, false), reducerForServiceMethod(UPDATE, false), reducerForServiceMethod(PATCH, false), reducerForServiceMethod(REMOVE, false), reducerForServiceMessages(CREATE + 'D'), reducerForServiceMessages(UPDATE + 'D'), reducerForServiceMessages(PATCH + 'ED'), reducerForServiceMessages(REMOVE + 'D', true),

    // reset status if no promise is pending
    _defineProperty({}, RESET, function (state, action) {
      var _extends6;

      debug('redux:' + RESET, action);

      if (state[opts.isLoading] || state[opts.isSaving]) {
        return state;
      }

      return _extends({}, state, (_extends6 = {}, _defineProperty(_extends6, opts.data, []), _defineProperty(_extends6, opts.requests, {}), _extends6));
    })), (_handleActions = {}, _defineProperty(_handleActions, opts.data, []), _defineProperty(_handleActions, opts.requests, {}), _handleActions))
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

exports.default = function (app, routeNameMap, options) {
  var services = {};
  var routeNames = {};

  if (typeof routeNameMap === 'string') {
    routeNames = _defineProperty({}, routeNameMap, routeNameMap);
  } else if (Array.isArray(routeNameMap)) {
    routeNameMap.forEach(function (name) {
      routeNames[name] = name;
    });
  } else if ((typeof routeNameMap === 'undefined' ? 'undefined' : _typeof(routeNameMap)) === 'object') {
    routeNames = routeNameMap;
  }

  Object.keys(routeNames).forEach(function (route) {
    services[routeNames[route]] = reduxifyService(app, route, routeNames[route], options);
  });

  return services;
};

var EVENTS = ['created', 'updated', 'patched', 'removed'];

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
var automaticDispatchEvents = exports.automaticDispatchEvents = function automaticDispatchEvents(app, routeNameMap, dispatch, services) {
  var routeNames = {};
  if (typeof routeNameMap === 'string') {
    routeNames = _defineProperty({}, routeNameMap, routeNameMap);
  } else if (Array.isArray(routeNameMap)) {
    routeNameMap.forEach(function (name) {
      routeNames[name] = name;
    });
  } else if ((typeof routeNameMap === 'undefined' ? 'undefined' : _typeof(routeNameMap)) === 'object') {
    routeNames = routeNameMap;
  }

  Object.keys(routeNames).forEach(function (route) {
    var debug = (0, _debug2.default)('event:' + route);
    var service = app.service(route);
    EVENTS.forEach(function (event) {
      service.on(event, function (data) {
        debug('event:' + event, data);
        dispatch(services[routeNames[route]][event](data));
      });
    });
  });
};