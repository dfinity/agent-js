'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.ReadableBlob = void 0;
const lite_js_1 = __importDefault(require('mime/lite.js'));
class ReadableBlob {
  constructor(fileName, blob) {
    this.fileName = fileName;
    this._blob = blob;
  }
  get contentType() {
    var _a;
    return (
      this._blob.type ||
      ((_a = lite_js_1.default.getType(this.fileName)) !== null && _a !== void 0
        ? _a
        : 'application/octet-stream')
    );
  }
  get length() {
    return this._blob.size;
  }
  async open() {
    return Promise.resolve();
  }
  async close() {
    return Promise.resolve();
  }
  async slice(start, end) {
    return new Uint8Array(await this._blob.slice(start, end).arrayBuffer());
  }
}
exports.ReadableBlob = ReadableBlob;
//# sourceMappingURL=readableBlob.js.map
