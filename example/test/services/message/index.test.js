
const assert = require('assert');
const app = require('feathers-service-verify-reset');

describe('message service', () => {
  it('registered the messages service', () => {
    assert.ok(app.service('messages'));
  });
});
