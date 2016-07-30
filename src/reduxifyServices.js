
import { createAction, handleActions } from 'redux-actions';
import makeDebug from 'debug';

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

const reduxifyService = (app, serviceName, options = {}) => {
  const defaults = {
    isError: 'isError',
    isLoading: 'isLoading',
    isSaving: 'isSaving',
    isFinished: 'isFinished',
    data: 'data',
    queryResult: 'queryResult',
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    REJECTED: 'REJECTED',
  };
  const opts = Object.assign({}, defaults, options);
  const SERVICE_NAME = `SERVICES_${serviceName.toUpperCase()}_`;
  const debug = makeDebug(`reducer:${serviceName}`);

  const service = app.service(serviceName);
  if (!service) {
    debug(`redux: Feathers service '${serviceName} does not exist.`);
    throw Error(`Feathers service '${serviceName} does not exist.`);
  }

  const reducerForServiceMethod = (actionType, ifLoading, isFind) => ({
    [`${actionType}_${opts.PENDING}`]: (state, action) => {
      debug(`redux:${actionType}_${opts.PENDING}`, action);
      return ({
        ...state,
        [opts.isError]: null,
        [opts.isLoading]: ifLoading,
        [opts.isSaving]: !ifLoading,
        [opts.isFinished]: false,
        [opts.data]: null,
        [opts.queryResult]: null,

      });
    },

    [`${actionType}_${opts.FULFILLED}`]: (state, action) => {
      debug(`redux:${actionType}_${opts.FULFILLED}`, action);
      return {
        ...state,
        [opts.isError]: null,
        [opts.isLoading]: false,
        [opts.isSaving]: false,
        [opts.isFinished]: true,
        [opts.data]: !isFind ? action.payload : null,
        [opts.queryResult]: isFind ? action.payload : null,
      };
    },

    [`${actionType}_${opts.REJECTED}`]: (state, action) => {
      debug(`redux:${actionType}_${opts.REJECTED}`, action);
      return {
        ...state,
        // action.payload = { name: "NotFound", message: "No record found for id 'G6HJ45'",
        //   code:404, className: "not-found" }
        [opts.isError]: action.payload,
        [opts.isLoading]: false,
        [opts.isSaving]: false,
        [opts.isFinished]: false,
        [opts.data]: null,
        [opts.queryResult]: null,
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
  const EVENT = `${SERVICE_NAME}EVENT`;

  return {
    // ACTION CREATORS

    find: createAction(FIND, (p) => ({ promise: service.find(p) })),
    get: createAction(GET, (id, p) => ({ promise: service.get(id, p) })),
    create: createAction(CREATE, (d, p) => ({ promise: service.create(d, p) })),
    update: createAction(UPDATE, (id, d, p) => ({ promise: service.update(id, d, p) })),
    patch: createAction(PATCH, (id, d, p) => ({ promise: service.patch(id, d, p) })),
    remove: createAction(REMOVE, (id, p) => ({ promise: service.remove(id, p) })),
    on: (event, data, fcn) => (dispatch, getState) => { fcn(event, data, dispatch, getState); },

    // REDUCER

    reducer: handleActions(
      Object.assign({},
        reducerForServiceMethod(FIND, true, true),
        reducerForServiceMethod(GET, true),
        reducerForServiceMethod(CREATE, false),
        reducerForServiceMethod(UPDATE, false),
        reducerForServiceMethod(PATCH, false),
        reducerForServiceMethod(REMOVE, false)
      ),
      {
        [opts.isError]: null,
        [opts.isLoading]: false,
        [opts.isSaving]: false,
        [opts.isFinished]: false,
        [opts.data]: null,
        [opts.queryResult]: null,
      }
    )
  };
};

// Convenience method

export default (app, serviceNames, options) => {
  serviceNames = Array.isArray(serviceNames) ? serviceNames : [serviceNames];
  const services = {};

  serviceNames.forEach(name => {
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

export const getServicesStatus = (servicesState, serviceNames) => {
  serviceNames = Array.isArray(serviceNames) ? serviceNames : [serviceNames];
  var status = {
    message: '',
    className: '',
    serviceName: '',
  };

  serviceNames.forEach(name => {
    const state = servicesState[name];

    if (state.isError) {
      status.message = state.isError.message;
      status.className = state.isError.className;
      status.serviceName = name;
      return status;
    }
  });

  serviceNames.forEach(name => {
    const state = servicesState[name];

    if (state.isLoading || state.isSaving) {
      status.message = `${name} is ${state.isLoading ? 'loading' : 'saving'}`;
      status.className = state.isLoading ? 'isLoading' : 'isSaving';
      status.serviceName = name;
      return status;
    }
  });

  return status;
};