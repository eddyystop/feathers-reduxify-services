
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import configureStore from './store';
import feathersApp, { services } from './feathers'; // eslint-disable-line no-unused-vars
import App from './App';

const store = configureStore();

store.dispatch(services.messages.create({ text: 'hello' }));
store.dispatch(services.messages.find());
store.dispatch(services.messages.get('hjhjhj'));

/*
const messages = feathersApp.service('messages');

messages.on('created', data => {
  store.dispatch(
    services.messages.on('created', data, (event, data, dispatch, getState) => {
      console.log('--created event', data);
    })
  );
});
*/

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
