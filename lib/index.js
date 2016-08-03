'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getServicesStatus = undefined;

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
 *     messages.create({ name: 'John' }, (err, data) => {...});
 * you first wrap the feathers service to expose Redux action creators and a reducer
 *     messages = reduxifyService(app, 'messages');
 * You can thereafter use the service in a standard Redux manner
 *     store.dispatch(messages.create({ name: 'John' }));
 * with async action creators being dispatched to a reducer which manages state.
 *
 * @param {Object} app the configured Feathers app, e.g. require('feathers-client')().configure(...)
 * @param {String} serviceName is Feathers' name for the service.
 * @param {Object} options
 * @returns {{find: *, get: *, create: *, update: *, patch: *, remove: *, on: *, reducer: *}}
 *
 * Action creators for methods are returned as { find, get, create, update, patch, remove }.
 * They expect the same parameters as their Feathers service methods, e.g. (id, data, params).
 *
 * The reducer { reducer } expects action types 'SERVICES_${SERVICE_NAME}_${METHOD}_PENDING',
 * ...FULFILLED and ...REJECTED. SERVICE_NAME is serviceName in upper case; METHOD is FIND, GET, ...
 *
 * You can implement optimistic updates within ...PENDING, finalizing them in ...FULFILL.
 *
 * The reducer's JS state (not immutable) is {
 *   isError: String|null, isLoading: Boolean, isSaving: Boolean, isFinished: Boolean,
 *   data: Object|null, queryResult: Object|null
 * }.
 * The find method stores Feathers' query payload in queryResult. Other methods store in data.
 *
 * isError is Feathers' error payload { message, name, code, className, errors |.
 *
 * Options may change the prop names and the reducer action type names.
 *
 * An action creator for listening on service events is returned as { on } and could be used like:
 *   import feathersApp, { services } from './feathers';
 *   feathersApp.service('messages').on('created', data => { store.dispatch(
 *       services.messages.on('created', data, (event, data, dispatch, getState) => {
 *         // handle data change
 *       })
 *   ); });
 */

var reduxifyService = function reduxifyService(app, serviceName) {
  var _handleActions;

  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

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
  var SERVICE_NAME = 'SERVICES_' + serviceName.toUpperCase() + '_';
  var debug = (0, _debug2.default)('reducer:' + serviceName);

  var service = app.service(serviceName);
  if (!service) {
    debug('redux: Feathers service \'' + serviceName + ' does not exist.');
    throw Error('Feathers service \'' + serviceName + ' does not exist.');
  }

  var reducerForServiceMethod = function reducerForServiceMethod(actionType, ifLoading, isFind) {
    var _ref;

    return _ref = {}, _defineProperty(_ref, actionType + '_' + opts.PENDING, function undefined(state, action) {
      var _extends2;

      debug('redux:' + actionType + '_' + opts.PENDING, action);
      return _extends({}, state, (_extends2 = {}, _defineProperty(_extends2, opts.isError, null), _defineProperty(_extends2, opts.isLoading, ifLoading), _defineProperty(_extends2, opts.isSaving, !ifLoading), _defineProperty(_extends2, opts.isFinished, false), _defineProperty(_extends2, opts.data, null), _defineProperty(_extends2, opts.queryResult, null), _extends2));
    }), _defineProperty(_ref, actionType + '_' + opts.FULFILLED, function undefined(state, action) {
      var _extends3;

      debug('redux:' + actionType + '_' + opts.FULFILLED, action);
      return _extends({}, state, (_extends3 = {}, _defineProperty(_extends3, opts.isError, null), _defineProperty(_extends3, opts.isLoading, false), _defineProperty(_extends3, opts.isSaving, false), _defineProperty(_extends3, opts.isFinished, true), _defineProperty(_extends3, opts.data, !isFind ? action.payload : null), _defineProperty(_extends3, opts.queryResult, isFind ? action.payload : null), _extends3));
    }), _defineProperty(_ref, actionType + '_' + opts.REJECTED, function undefined(state, action) {
      var _extends4;

      debug('redux:' + actionType + '_' + opts.REJECTED, action);
      return _extends({}, state, (_extends4 = {}, _defineProperty(_extends4, opts.isError, action.payload), _defineProperty(_extends4, opts.isLoading, false), _defineProperty(_extends4, opts.isSaving, false), _defineProperty(_extends4, opts.isFinished, false), _defineProperty(_extends4, opts.data, null), _defineProperty(_extends4, opts.queryResult, null), _extends4));
    }), _ref;
  };

  // ACTION TYPES

  var FIND = SERVICE_NAME + 'FIND';
  var GET = SERVICE_NAME + 'GET';
  var CREATE = SERVICE_NAME + 'CREATE';
  var UPDATE = SERVICE_NAME + 'UPDATE';
  var PATCH = SERVICE_NAME + 'PATCH';
  var REMOVE = SERVICE_NAME + 'REMOVE';

  return {
    // ACTION CREATORS

    find: (0, _reduxActions.createAction)(FIND, function (p) {
      return { promise: service.find(p) };
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
    on: function on(event, data, fcn) {
      return function (dispatch, getState) {
        fcn(event, data, dispatch, getState);
      };
    },

    // REDUCER

    reducer: (0, _reduxActions.handleActions)(Object.assign({}, reducerForServiceMethod(FIND, true, true), reducerForServiceMethod(GET, true), reducerForServiceMethod(CREATE, false), reducerForServiceMethod(UPDATE, false), reducerForServiceMethod(PATCH, false), reducerForServiceMethod(REMOVE, false)), (_handleActions = {}, _defineProperty(_handleActions, opts.isError, null), _defineProperty(_handleActions, opts.isLoading, false), _defineProperty(_handleActions, opts.isSaving, false), _defineProperty(_handleActions, opts.isFinished, false), _defineProperty(_handleActions, opts.data, null), _defineProperty(_handleActions, opts.queryResult, null), _handleActions))
  };
};

// Convenience method

exports.default = function (app, serviceNames, options) {
  serviceNames = // eslint-disable-line no-param-reassign
  Array.isArray(serviceNames) ? serviceNames : [serviceNames];
  var services = {};

  serviceNames.forEach(function (name) {
    services[name] = reduxifyService(app, name, options);
  });

  return services;
};

/**
 * Get a status to display as a summary of all Feathers services.
 *
 * The services are checked in serviceNames order.
 * The first service with an error, returns its error message as a status.
 * Otherwise the first service loading or saving returns its status.
 *
 * @param {Object} servicesState .[name] has the JS state (not immutable) for service 'name'.
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

  var done = serviceNames.some(function (name) {
    var state = servicesState[name];

    if (state.isError) {
      status.message = state.isError.message;
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

    if (state.isLoading || state.isSaving) {
      status.message = name + ' is ' + (state.isLoading ? 'loading' : 'saving');
      status.className = state.isLoading ? 'isLoading' : 'isSaving';
      status.serviceName = name;
      return true;
    }

    return false;
  });

  return status;
};