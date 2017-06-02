
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import configureStore from './store';
import feathersApp, { routeMap, services } from './feathers'; // eslint-disable-line no-unused-vars
import { automaticDispatchEvents } from '../../lib';
import App from './App';

const store = configureStore();
automaticDispatchEvents(feathersApp, routeMap, store.dispatch, services);

store.dispatch(services.messages.create({ text: 'hello' }));
store.dispatch(services.messages.find());
store.dispatch(services.messages.get('hjhjhj'));

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
