'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.log = log;
function log(event, data = {}) {
  console.log(JSON.stringify({ event, ...data }));
}
