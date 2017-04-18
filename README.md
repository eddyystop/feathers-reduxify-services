## feathers-reduxify-services

Wrap Feathers services so they work transparently and perfectly with Redux.

[![Build Status](https://travis-ci.org/eddyystop/feathers-reduxify-services.svg?branch=master)](https://travis-ci.org/eddyystop/feathers-reduxify-services)
[![Coverage Status](https://coveralls.io/repos/github/eddyystop/feathers-reduxify-services/badge.svg?branch=master)](https://coveralls.io/github/eddyystop/feathers-reduxify-services?branch=master)

> Integrate Feathers and Redux with one line of code.

```javascript
/* on server */
app.use('/users', ...);
app.use('/messages', ...);

/* on client */
const app = feathers().configure(feathers.socketio(socket)).configure(feathers.hooks());

// reduxify Feathers' services
const services = reduxifyServices(app, ['users', 'messages']); // the 1 line

// hook up Redux reducers
export default combineReducers({
  users: services.users.reducer,
  messages: services.messages.reducer,
});

// Feathers is now 100% compatible with Redux
store.dispatch(services.messages.get('557XxUL8PalGMgOo'));
store.dispatch(services.messages.find());
store.dispatch(services.messages.create({ text: 'Shiver me timbers!' }));
```

**_Simple, huh._**

[](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd?utm_source=chrome-app-launcher-info-dialog)
![](./docs/screen-shot.jpg)

## <a name="codeExample"></a> Code Example

Expose action creators and reducers for Feathers services. Then use them like normal Redux.

```javascript
import { applyMiddleware, combineReducers, createStore } from 'redux';
import reduxifyServices, { getServicesStatus } from 'feathers-reduxify-services';
const feathersApp = feathers().configure(feathers.socketio(socket)) ...

// Expose Redux action creators and reducers for Feathers' services
const services = reduxifyServices(feathersApp, ['users', 'messages']);

// Typical Redux store creation, crammed together
const store = applyMiddleware(
  reduxThunk, reduxPromiseMiddleware() // middleware needed
)(createStore)(combineReducers({
  users: services.users.reducer, // include reducers for Feathers' services
  messages: services.messages.reducer
}));

// Invoke Feathers' services using standard Redux.
store.dispatch(services.messages.get('557XxUL8PalGMgOo'));
store.dispatch(services.messages.find());
store.dispatch(services.messages.create({ text: 'Shiver me timbers!' }));
```

Dispatch Redux actions on Feathers' real time service events.

```javascript
const messages = feathersApp.service('messages');

messages.on('created', data => {
  store.dispatch(
    // Create a thunk action to invoke the function.
    services.messages.on('created', data, (eventName, data, dispatch, getState) => {
      console.log('--created event', data);
    })
  );
});
```

Keep the user informed of service activity.

```javascript
const status = getServicesStatus(servicesRootState, ['users', 'messages']).message;
```

## Motivation

Feathers is a great real-time client-server framework.
Redux is a great state container for the front-end.
React is a great declarative UI.

This repo let's all 3 work together easily.

## Installation

Install [Nodejs](https://nodejs.org/en/).

Run `npm install feathers-reduxify-services --save` in your project folder.

You can then require the utilities.

`/src` on GitHub contains the ES6 source.

## Running the Example

Make sure you have [NodeJS](https://nodejs.org/) installed.

Install your dependencies.
    
```
npm install webpack -g
cd path/to/feathers-reduxify-services
npm install
cd example
npm install
```
    
Build the client bundle.

`npm run build` bundles the client code into `public/dist/bundle.js`.

Start your app.
    
```
cd path/to/feathers-reduxify-services/example
npm start
```

The NeDb database `data/messages.db` has 6 items in it, with text `message 1` to `message 6`.

Point your browser at `localhost:3030/index.html`

The client, on startup, adds a `Hello` item to `messages`, `find`'s and displays 5 items,
and tries to `get` a non-existent item.

You can `create`, `get` and `find` items using the UI.

`client/feathers/index.js` reduxifies the `users` and `messages` feathers services
and exports their action creators and reducer as `{ services }`.
`client/reducers/index.js` hooks up the reducers for the reduxified services.
`client/index.js` performs the initial `create`, `find` and `get`.
`client/App.js::mapDispatchToProps` dispatches UI events.

## API Reference

See Code Example.
See `/example` working example.
Each module is fully documented.

This repo does the heavy redux lifting in
[feathers-starter-react-redux-login-roles](https://github.com/eddyystop/feathers-starter-react-redux-login-roles).

## Tests

`npm test` to run tests.

`npm run cover` to run tests plus coverage.

## <a name="changeLog"></a> Change Log

[List of notable changes.](./CHANGELOG.md)

## Contributors

- [eddyystop](https://github.com/eddyystop)

## License

MIT. See [LICENSE](./LICENSE).