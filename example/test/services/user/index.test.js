
const assert = require('assert');
const app = require('feathers-service-verify-reset');

describe('user service', () => {
  it('registered the users service', () => {
    assert.ok(app.service('users'));
  });
});
