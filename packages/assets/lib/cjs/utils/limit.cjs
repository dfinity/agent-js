'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.limit = void 0;
/**
 * Minimal promise executor with concurrency limit implementation
 * @param concurrency Maximum number of promises executed concurrently
 */
const limit = concurrency => {
  const queue = [];
  let active = 0;
  const next = () => {
    var _a;
    if (active < concurrency && queue.length > 0) {
      active++;
      const { fn, resolve, reject } = (_a = queue.shift()) !== null && _a !== void 0 ? _a : {};
      fn === null || fn === void 0
        ? void 0
        : fn()
            .then(resolve)
            .catch(reject)
            .then(() => {
              active--;
              next();
            });
    }
  };
  return fn =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
};
exports.limit = limit;
//# sourceMappingURL=limit.js.map
