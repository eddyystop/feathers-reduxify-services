
/* eslint no-console: 0 */

const hooks = require('feathers-hooks');
const auth = require('feathers-authentication').hooks;

exports.before = {
  all: [],
  find: [
    auth.verifyToken(),
    auth.populateUser(),
    auth.restrictToAuthenticated(),
  ],
  get: [
    auth.verifyToken(),
    auth.populateUser(),
    auth.restrictToAuthenticated(),
    auth.restrictToOwner({ ownerField: '_id' }),
  ],
  create: [
    auth.hashPassword(),
  ],
  update: [
    auth.verifyToken(),
    auth.populateUser(),
    auth.restrictToAuthenticated(),
    auth.restrictToOwner({ ownerField: '_id' }),
  ],
  patch: [
    auth.verifyToken(),
    auth.populateUser(),
    auth.restrictToAuthenticated(),
    auth.restrictToOwner({ ownerField: '_id' }),
  ],
  remove: [
    auth.verifyToken(),
    auth.populateUser(),
    auth.restrictToAuthenticated(),
    auth.restrictToOwner({ ownerField: '_id' }),
  ],
};

exports.after = {
  find: [
    hooks.remove('password'),
  ],
  get: [
    hooks.remove('password'),
  ],
  create: [
    hooks.remove('password'),
    emailVerification, // send email to verify the email addr
  ],
  update: [
    hooks.remove('password'),
  ],
  patch: [
    hooks.remove('password'),
  ],
  remove: [
    hooks.remove('password'),
  ],
};

function emailVerification(hook, next) {
  const user = hook.result;

  console.log('-- Sending email to verify new user\'s email addr');
  console.log(`Dear ${user.username}, please click this link to verify your email addr.`);
  console.log(`  http://localhost:3030/socket/verify/${user.verifyToken}`);

  next(null, hook);
}
