
const auth = require('feathers-authentication').hooks;
const verifyHooks = require('../../../hooks').verifyResetHooks; // NEW

exports.before = {
  all: [
    /*
    auth.verifyToken(),
    auth.populateUser(),
    auth.restrictToAuthenticated(),
    verifyHooks.restrictToVerified(), // NEW
    */
  ],
  find: [],
  get: [],
  create: [],
  update: [],
  patch: [],
  remove: [],
};

exports.after = {
  all: [],
  find: [],
  get: [],
  create: [],
  update: [],
  patch: [],
  remove: [],
};
