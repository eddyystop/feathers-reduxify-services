'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getServicesStatus = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _reduxActions = require('redux-actions');

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

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
 *   isError: String|null,
 *   isLoading: Boolean,
 *   isSaving: Boolean,
 *   isFinished: Boolean,
 *   data: Object|null,
 *   queryResult: Object|null
 * }.
 * The find service call stores Feathers' query payload in queryResult. Other methods store in data.
 *
 * isError is Feathers' error payload { message, name, code, className, errors }.
 * If the feathers server response did not specify an error message, then the message property will
 * be feathers default of 'Error'.
 *
 * Options may change the state property names and the reducer action type names.
 *
 * Each service also gets a reset service call which re-initializes that service's state.
 * This may be used, for example, to remove isError in order to no longer render error messages.
 * store.dispatch(messages.reset(true)) will leave queryResult as is during initialization.
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

  var name = arguments.length <= 2 || arguments[2] === undefined ? route : arguments[2];
  var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

  var debug = (0, _debug2.default)('reducer:' + name);
  debug('route ' + route);

  var defaults = {
    isError: 'isError',
    isLoading: 'isLoading',
    isSaving: 'isSaving',
    isFinished: 'isFinished',
    data: 'data',
    queryResult: 'queryResult',
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

  var reducerForServiceMethod = function reducerForServiceMethod(actionType, ifLoading, isFind) {
    var _ref;

    return _ref = {}, _defineProperty(_ref, actionType + '_' + opts.PENDING, function undefined(state, action) {
      var _extends2;

      debug('redux:' + actionType + '_' + opts.PENDING, action);
      return _extends({}, state, (_extends2 = {}, _defineProperty(_extends2, opts.isError, null), _defineProperty(_extends2, opts.isLoading, ifLoading), _defineProperty(_extends2, opts.isSaving, !ifLoading), _defineProperty(_extends2, opts.isFinished, false), _defineProperty(_extends2, opts.data, null), _defineProperty(_extends2, opts.queryResult, state[opts.queryResult] || null), _extends2));
    }), _defineProperty(_ref, actionType + '_' + opts.FULFILLED, function undefined(state, action) {
      var _extends3;

      debug('redux:' + actionType + '_' + opts.FULFILLED, action);
      return _extends({}, state, (_extends3 = {}, _defineProperty(_extends3, opts.isError, null), _defineProperty(_extends3, opts.isLoading, false), _defineProperty(_extends3, opts.isSaving, false), _defineProperty(_extends3, opts.isFinished, true), _defineProperty(_extends3, opts.data, !isFind ? action.payload : null), _defineProperty(_extends3, opts.queryResult, isFind ? action.payload : state[opts.queryResult] || null), _extends3));
    }), _defineProperty(_ref, actionType + '_' + opts.REJECTED, function undefined(state, action) {
      var _extends4;

      debug('redux:' + actionType + '_' + opts.REJECTED, action);
      return _extends({}, state, (_extends4 = {}, _defineProperty(_extends4, opts.isError, action.payload), _defineProperty(_extends4, opts.isLoading, false), _defineProperty(_extends4, opts.isSaving, false), _defineProperty(_extends4, opts.isFinished, true), _defineProperty(_extends4, opts.data, null), _defineProperty(_extends4, opts.queryResult, isFind ? null : state[opts.queryResult] || null), _extends4));
    }), _ref;
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
    }),
    get: (0, _reduxActions.createAction)(GET, function (id, p) {
      return { promise: service.get(id, p) };
    }),
    create: (0, _reduxActions.createAction)(CREATE, function (d, p) {
      return { promise: service.create(d, p) };
    }),
    update: (0, _reduxActions.createAction)(UPDATE, function (id, d, p) {
      return { promise: service.update(id, d, p) };
    }),
    patch: (0, _reduxActions.createAction)(PATCH, function (id, d, p) {
      return { promise: service.patch(id, d, p) };
    }),
    remove: (0, _reduxActions.createAction)(REMOVE, function (id, p) {
      return { promise: service.remove(id, p) };
    }),
    reset: (0, _reduxActions.createAction)(RESET),
    on: function on(event, data, fcn) {
      return function (dispatch, getState) {
        fcn(event, data, dispatch, getState);
      };
    },

    // REDUCER

    reducer: (0, _reduxActions.handleActions)(Object.assign({}, reducerForServiceMethod(FIND, true, true), reducerForServiceMethod(GET, true), reducerForServiceMethod(CREATE, false), reducerForServiceMethod(UPDATE, false), reducerForServiceMethod(PATCH, false), reducerForServiceMethod(REMOVE, false),

    // reset status if no promise is pending
    _defineProperty({}, RESET, function (state, action) {
      var _extends5;

      debug('redux:' + RESET, action);

      if (state[opts.isLoading] || state[opts.isSaving]) {
        return state;
      }

      return _extends({}, state, (_extends5 = {}, _defineProperty(_extends5, opts.isError, null), _defineProperty(_extends5, opts.isLoading, false), _defineProperty(_extends5, opts.isSaving, false), _defineProperty(_extends5, opts.isFinished, false), _defineProperty(_extends5, opts.data, null), _defineProperty(_extends5, opts.queryResult, action.payload ? state[opts.queryResult] : null), _extends5));
    })), (_handleActions = {}, _defineProperty(_handleActions, opts.isError, null), _defineProperty(_handleActions, opts.isLoading, false), _defineProperty(_handleActions, opts.isSaving, false), _defineProperty(_handleActions, opts.isFinished, false), _defineProperty(_handleActions, opts.data, null), _defineProperty(_handleActions, opts.queryResult, null), _handleActions))
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

/**
 * Get a status to display as a summary of all Feathers services.
 *
 * The services are checked in serviceNames order.
 * The first service with an error message, returns that as the status.
 * Otherwise the first service loading or saving returns its status.
 *
 * @param {Object} servicesState - the slice of state containing the states for the services.
 *    state[name] has the JS state (not immutable) for service 'name'.
 * @param {Array|String} serviceNames
 * @returns {{message: string, className: string, serviceName: string}}
 *    message is the English language status text.
 *    You can create your own internationalized messages with serviceName and className.
 *    className will be isLoading, isSaving or it will be Feathers' error's className.
 */

var getServicesStatus = exports.getServicesStatus = function getServicesStatus(servicesState, serviceNames) {
  var status = { // eslint-disable-line no-var
    message: '',
    className: '',
    serviceName: ''
  };
  serviceNames = // eslint-disable-line no-param-reassign
  Array.isArray(serviceNames) ? serviceNames : [serviceNames];

  // Find an error with an err.message. 'Error' is what feather returns when there is no msg text.
  var done = serviceNames.some(function (name) {
    var state = servicesState[name];

    if (state && state.isError && state.isError.message && state.isError.message !== 'Error') {
      status.message = name + ': ' + state.isError.message;
      status.className = state.isError.className;
      status.serviceName = name;
      return true;
    }

    return false;
  });

  if (done) {
    return status;
  }

  serviceNames.some(function (name) {
    var state = servicesState[name];

    if (state && !state.isError && (state.isLoading || state.isSaving)) {
      status.message = name + ' is ' + (state.isLoading ? 'loading' : 'saving');
      status.className = state.isLoading ? 'isLoading' : 'isSaving';
      status.serviceName = name;
      return true;
    }

    return false;
  });

  return status;
};