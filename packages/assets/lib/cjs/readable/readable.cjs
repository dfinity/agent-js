'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isReadable = void 0;
const isObjWithKeys = (obj, ...keys) =>
  obj !== null &&
  typeof obj === 'object' &&
  keys.every(key => key !== null && key !== undefined && key in obj);
const isReadable = value =>
  isObjWithKeys(value, 'fileName', 'contentType', 'length', 'open', 'close', 'slice') &&
  typeof value.fileName === 'string' &&
  typeof value.contentType === 'string' &&
  typeof value.length === 'number' &&
  typeof value.open === 'function' &&
  typeof value.close === 'function' &&
  typeof value.slice === 'function';
exports.isReadable = isReadable;
//# sourceMappingURL=readable.js.map
