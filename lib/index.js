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

  var reducerForServiceMessages = function reducerForServiceMessages(actionType) {
    return _defineProperty({}, actionType, function (state, action) {
      debug('redux:' + actionType, action);

      var isDelete = actionType.endsWith('REMOVED');
      var arrayResult = _lodash2.default.isArray(action.payload) ? action.payload : [action.payload];
      var idField = _lodash2.default.has(arrayResult[0], 'id') ? 'id' : '_id';
      return _extends({}, state, _defineProperty({}, opts.data, isDelete ? _lodash2.default.filter(state[opts.data], function (obj) {
        return _lodash2.default.map(arrayResult, function (o) {
          return o[idField];
        }).indexOf(obj[idField]) === -1;
      }) : _lodash2.default.unionBy(arrayResult, state[opts.data], idField)));
    });
  };

  var reducerForServiceMethod = function reducerForServiceMethod(actionType) {
    var _ref2;

    return _ref2 = {}, _defineProperty(_ref2, actionType + '_' + opts.PENDING, function undefined(state, action) {
      var _action$meta$rid;

      debug('redux:' + actionType + '_' + opts.PENDING, action);

      var ifLoading = actionType.endsWith('FIND') || actionType.endsWith('GET');
      return _extends({}, state, _defineProperty({}, opts.requests, _extends({}, state[opts.requests], _defineProperty({}, action.meta.rid, (_action$meta$rid = {}, _defineProperty(_action$meta$rid, opts.isLoading, ifLoading), _defineProperty(_action$meta$rid, opts.isSaving, !ifLoading), _defineProperty(_action$meta$rid, opts.isFinished, false), _defineProperty(_action$meta$rid, opts.isError, null), _defineProperty(_action$meta$rid, opts.query, action.meta.query), _action$meta$rid)))));
    }), _defineProperty(_ref2, actionType + '_' + opts.FULFILLED, function undefined(state, action) {
      var _extends5, _extends7;

      debug('redux:' + actionType + '_' + opts.FULFILLED, action);

      var arrayResult = _lodash2.default.isArray(action.payload) ? action.payload : [action.payload];
      var idField = _lodash2.default.has(arrayResult[0], 'id') ? 'id' : '_id';
      var isDelete = actionType.endsWith('REMOVE');
      return _extends({}, state, (_extends7 = {}, _defineProperty(_extends7, opts.data, isDelete ? _lodash2.default.filter(state[opts.data], function (obj) {
        return _lodash2.default.map(arrayResult, function (o) {
          return o[idField];
        }).indexOf(obj[idField]) === -1;
      }) : _lodash2.default.unionBy(arrayResult, state[opts.data], idField)), _defineProperty(_extends7, opts.requests, _extends({}, state[opts.requests], _defineProperty({}, action.meta.rid, _extends({}, state[opts.requests][action.meta.rid], (_extends5 = {}, _defineProperty(_extends5, opts.isLoading, false), _defineProperty(_extends5, opts.isSaving, false), _defineProperty(_extends5, opts.isFinished, true), _defineProperty(_extends5, opts.result, _lodash2.default.map(arrayResult, idField)), _extends5))))), _extends7));
    }), _defineProperty(_ref2, actionType + '_' + opts.REJECTED, function undefined(state, action) {
      var _extends8;

      debug('redux:' + actionType + '_' + opts.REJECTED, action);

      return _extends({}, state, _defineProperty({}, opts.requests, _extends({}, state[opts.requests], _defineProperty({}, action.meta.rid, _extends({}, state[opts.requests][action.meta.rid], (_extends8 = {}, _defineProperty(_extends8, opts.isLoading, false), _defineProperty(_extends8, opts.isSaving, false), _defineProperty(_extends8, opts.isFinished, true), _defineProperty(_extends8, opts.isError, action.payload), _extends8))))));
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

    // REDUCER
    reducer: (0, _reduxActions.handleActions)(Object.assign({}, reducerForServiceMethod(FIND), reducerForServiceMethod(GET), reducerForServiceMethod(CREATE), reducerForServiceMethod(UPDATE), reducerForServiceMethod(PATCH), reducerForServiceMethod(REMOVE), reducerForServiceMessages(CREATE + 'D'), reducerForServiceMessages(UPDATE + 'D'), reducerForServiceMessages(PATCH + 'ED'), reducerForServiceMessages(REMOVE + 'D'),

    // reset status if no promise is pending
    _defineProperty({}, RESET, function (state, action) {
      var _extends11;

      debug('redux:' + RESET, action);

      if (_lodash2.default.some(state[opts.requests], opts.isLoading) || _lodash2.default.some(state[opts.requests], opts.isSaving)) {
        return state;
      }

      return _extends({}, state, (_extends11 = {}, _defineProperty(_extends11, opts.data, action.payload ? state[opts.data] : []), _defineProperty(_extends11, opts.requests, {}), _extends11));
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
  var routeNames = convertRouteNames(routeNameMap);
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
 * @param {Object|Array|String} routeNameMap - The feathers services to reduxify.
 *                              See default export function.
 * @param {function} dispatch - store.dispatch method
 * @param {Object} services - return value of default. See above.
 */
var automaticDispatchEvents = exports.automaticDispatchEvents = function automaticDispatchEvents(app, routeNameMap, dispatch, services) {
  var routeNames = convertRouteNames(routeNameMap);
  var debug = (0, _debug2.default)('automaticDispatchEvents');
  Object.keys(routeNames).forEach(function (route) {
    var service = app.service(route);
    if (_lodash2.default.isFunction(service.on)) {
      EVENTS.forEach(function (event) {
        service.on(event, function (data) {
          debug('event:' + event, data);
          dispatch(services[routeNames[route]][event](data));
        });
      });
    }
  });
};

var convertRouteNames = function convertRouteNames(routeNameMap) {
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
  return routeNames;
};