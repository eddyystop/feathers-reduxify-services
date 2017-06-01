
/* global io */

import feathers from 'feathers-client';
import reduxifyServices from '../../../lib';

const socket = io();

const app = feathers()
  .configure(feathers.socketio(socket))
  .configure(feathers.hooks())
  .configure(feathers.authentication({ storage: window.localStorage }));

export default app;
export const routeMap = ['users', 'messages'];
export const services = reduxifyServices(app, routeMap);
