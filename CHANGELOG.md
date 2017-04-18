# Notable changes to feathers-reduxify-services

1.0.0

- Upgraded repo's dependencies to latest versions, including the Feathers Auk release.
- Upgraded repo's test and build to work on Windows.
- Upgraded example's dependencies to latest versions, including Feathers Auk release.
- Upgraded example to use Feathers authentication v1.
- Upgraded example's build to work on Windows.

0.3.0

You may have awkward REST paths on the feathers server like
`app.use('/verifyReset/:action/:value', ...);`.
You can now reduxify them using
`const services = reduxifyServices(app, { users: 'users', '/verifyReset/:action/:value', 'verifyReset'});`
and use them with a clean nomenclature like
`store.dispatch(services.verifyReset.create(...));`.
The previous array and string versions of the param will still work.

Other changes:
- Reduxified services now have a `reset` call which resets the service's state to its initial state.
This could, for example, remove `state.isError` from being rendered anywhere.
`store.dispatch(services.user.reset(true));`
however will leave the `state.queryResult` property unchanged, which can be useful.
- `state.queryResult` defaults to null rather than undefined.
- `state.queryResult` is now changed only on a new find service call.
This allows a list of items to be kept in `queryResult` while non-find service calls,
such as patch, are made to that same service. **_Breaking change._**
- `state.isFinished` is now true after a service call is rejected. *This was a bug.*
- `getServicesStatus` ignores errors where the service on the server provided no `error.message`.
(Feathers converts these to the string `Error` which is now ignored.) **_Breaking change._**
- `getServicesStatus` now returns an error status in the form `service: error.message`
rather than `error.message`. This is more informative when rendered.
- Test suite updated for these changes and new features.
