'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.sha224 = void 0;
const js_sha256_1 = require('js-sha256');
/**
 * Returns the SHA224 hash of the buffer.
 * @param data Arraybuffer to encode
 */
function sha224(data) {
  const shaObj = js_sha256_1.sha224.create();
  shaObj.update(data);
  return new Uint8Array(shaObj.array());
}
exports.sha224 = sha224;
//# sourceMappingURL=sha224.js.map
