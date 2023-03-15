'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.ReadablePath = void 0;
const lite_js_1 = __importDefault(require('mime/lite.js'));
const fs_1 = __importDefault(require('fs'));
const path_1 = __importDefault(require('path'));
class ReadablePath {
  constructor(path, size) {
    this._path = path;
    this._size = size;
  }
  get fileName() {
    return path_1.default.basename(this._path);
  }
  get contentType() {
    var _a;
    return (_a = lite_js_1.default.getType(this.fileName)) !== null && _a !== void 0
      ? _a
      : 'application/octet-stream';
  }
  get length() {
    return this._size;
  }
  static async create(path) {
    return new Promise((resolve, reject) => {
      fs_1.default.stat(path, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(new ReadablePath(path, stats.size));
      });
    });
  }
  async open() {
    return new Promise((resolve, reject) => {
      if (this._fd !== undefined) {
        reject('File is already open');
        return;
      }
      fs_1.default.open(this._path, (err, fd) => {
        if (err) {
          reject(err);
          return;
        }
        this._fd = fd;
        resolve();
      });
    });
  }
  async close() {
    return new Promise((resolve, reject) => {
      if (this._fd === undefined) {
        reject('No open file handle found');
        return;
      }
      fs_1.default.close(this._fd, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  async slice(start, end) {
    return new Promise((resolve, reject) => {
      if (this._fd === undefined) {
        reject('No open file handle found');
        return;
      }
      const buffer = Buffer.alloc(end - start);
      fs_1.default.read(this._fd, buffer, 0, end - start, start, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve(new Uint8Array(buffer));
      });
    });
  }
}
exports.ReadablePath = ReadablePath;
//# sourceMappingURL=readablePath.js.map
