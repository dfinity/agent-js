'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __rest =
  (this && this.__rest) ||
  function (s, e) {
    var t = {};
    for (var p in s)
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === 'function')
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
          t[p[i]] = s[p[i]];
      }
    return t;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.AssetManager = void 0;
const agent_1 = require('@dfinity/agent');
const candid_1 = require('@dfinity/candid');
const candid_2 = require('@dfinity/candid');
const assets_js_1 = require('./canisters/assets.js');
const js_sha256_1 = require('js-sha256');
const base64Arraybuffer = __importStar(require('base64-arraybuffer'));
const readable_js_1 = require('./readable/readable.js');
const readableFile_js_1 = require('./readable/readableFile.js');
const readableBlob_js_1 = require('./readable/readableBlob.js');
const readablePath_js_1 = require('./readable/readablePath.js');
const readableBytes_js_1 = require('./readable/readableBytes.js');
const limit_js_1 = require('./utils/limit.js');
const fs_1 = __importDefault(require('fs'));
class AssetManager {
  /**
   * Create assets canister manager instance
   * @param config Additional configuration options, canister id is required
   */
  constructor(config) {
    const { concurrency, maxSingleFileSize, maxChunkSize } = config,
      actorConfig = __rest(config, ['concurrency', 'maxSingleFileSize', 'maxChunkSize']);
    this._actor = (0, assets_js_1.getAssetsCanister)(actorConfig);
    this._limit = (0, limit_js_1.limit)(
      concurrency !== null && concurrency !== void 0 ? concurrency : 16,
    );
    this._maxSingleFileSize =
      maxSingleFileSize !== null && maxSingleFileSize !== void 0 ? maxSingleFileSize : 1900000;
    this._maxChunkSize = maxChunkSize !== null && maxChunkSize !== void 0 ? maxChunkSize : 1900000;
  }
  /**
   * Create readable from store arguments
   * @param args Arguments with either a file, blob, path, bytes or custom Readable implementation
   */
  static async toReadable(...args) {
    var _a, _b;
    if (typeof File === 'function' && args[0] instanceof File) {
      return new readableFile_js_1.ReadableFile(args[0]);
    }
    if (
      typeof Blob === 'function' &&
      args[0] instanceof Blob &&
      ((_a = args[1]) === null || _a === void 0 ? void 0 : _a.fileName)
    ) {
      return new readableBlob_js_1.ReadableBlob(args[1].fileName, args[0]);
    }
    if (typeof args[0] === 'string') {
      return await readablePath_js_1.ReadablePath.create(args[0]);
    }
    if (
      (Array.isArray(args[0]) || args[0] instanceof Uint8Array || args[0] instanceof ArrayBuffer) &&
      ((_b = args[1]) === null || _b === void 0 ? void 0 : _b.fileName)
    ) {
      return new readableBytes_js_1.ReadableBytes(args[1].fileName, args[0]);
    }
    if ((0, readable_js_1.isReadable)(args[0])) {
      return args[0];
    }
    throw new Error('Invalid arguments, readable could not be created');
  }
  /**
   * Get list of all files in assets canister
   * @returns All files in asset canister
   */
  async list() {
    return this._actor.list({});
  }
  /**
   * Store data on assets canister
   * @param args Arguments with either a file, blob, path, bytes or custom Readable implementation
   */
  async store(...args) {
    var _a, _b, _c, _d;
    const readable = await AssetManager.toReadable(...args);
    const [, config] = args;
    const key = [
      (_a = config === null || config === void 0 ? void 0 : config.path) !== null && _a !== void 0
        ? _a
        : '',
      (_b = config === null || config === void 0 ? void 0 : config.fileName) !== null &&
      _b !== void 0
        ? _b
        : readable.fileName,
    ].join('/');
    // If asset is small enough upload in one request else upload in chunks (batch)
    if (readable.length <= this._maxSingleFileSize) {
      (_c = config === null || config === void 0 ? void 0 : config.onProgress) === null ||
      _c === void 0
        ? void 0
        : _c.call(config, { current: 0, total: readable.length });
      await this._limit(async () => {
        var _a, _b;
        await readable.open();
        const bytes = await readable.slice(0, readable.length);
        await readable.close();
        const sha256 =
          (_a = config === null || config === void 0 ? void 0 : config.sha256) !== null &&
          _a !== void 0
            ? _a
            : new Uint8Array(
                js_sha256_1.sha256.create().update(new Uint8Array(bytes)).arrayBuffer(),
              );
        return this._actor.store({
          key,
          content: bytes,
          content_type: readable.contentType,
          sha256: [sha256],
          content_encoding:
            (_b = config === null || config === void 0 ? void 0 : config.contentEncoding) !==
              null && _b !== void 0
              ? _b
              : 'identity',
        });
      });
      (_d = config === null || config === void 0 ? void 0 : config.onProgress) === null ||
      _d === void 0
        ? void 0
        : _d.call(config, { current: readable.length, total: readable.length });
    } else {
      // Create batch to upload asset in chunks
      const batch = this.batch();
      await batch.store(readable, config);
      await batch.commit();
    }
    return key;
  }
  /**
   * Delete file from assets canister
   * @param key The path to the file on the assets canister e.g. /folder/to/my_file.txt
   */
  async delete(key) {
    await this._actor.delete_asset({ key });
  }
  /**
   * Delete all files from assets canister
   */
  async clear() {
    await this._actor.clear({});
  }
  /**
   * Get asset instance from assets canister
   * @param key The path to the file on the assets canister e.g. /folder/to/my_file.txt
   * @param acceptEncodings The accepted content encodings, defaults to ['identity']
   */
  async get(key, acceptEncodings) {
    const data = await this._actor.get({
      key,
      accept_encodings:
        acceptEncodings !== null && acceptEncodings !== void 0 ? acceptEncodings : ['identity'],
    });
    return new Asset(
      this._actor,
      this._limit,
      this._maxSingleFileSize,
      this._maxChunkSize,
      key,
      acceptEncodings !== null && acceptEncodings !== void 0 ? acceptEncodings : ['identity'],
      data.content,
      data.content_type,
      Number(data.total_length),
      data.content_encoding,
      data.content.length,
      data.sha256[0],
    );
  }
  /**
   * Create a batch assets operations instance, commit multiple operations in a single request
   */
  batch() {
    return new AssetManagerBatch(this._actor, this._limit, this._maxChunkSize);
  }
}
exports.AssetManager = AssetManager;
class AssetManagerBatch {
  constructor(_actor, _limit, _maxChunkSize) {
    this._actor = _actor;
    this._limit = _limit;
    this._maxChunkSize = _maxChunkSize;
    this._scheduledOperations = [];
    this._sha256 = {};
    this._progress = {};
  }
  /**
   * Insert batch operation to store data on assets canister
   * @param args Arguments with either a file, blob, path, bytes or custom Readable implementation
   */
  async store(...args) {
    var _a, _b, _c;
    const readable = await AssetManager.toReadable(...args);
    const [, config] = args;
    const key = [
      (_a = config === null || config === void 0 ? void 0 : config.path) !== null && _a !== void 0
        ? _a
        : '',
      (_b = config === null || config === void 0 ? void 0 : config.fileName) !== null &&
      _b !== void 0
        ? _b
        : readable.fileName,
    ].join('/');
    if (!(config === null || config === void 0 ? void 0 : config.sha256)) {
      this._sha256[key] = js_sha256_1.sha256.create();
    }
    this._progress[key] = { current: 0, total: readable.length };
    (_c = config === null || config === void 0 ? void 0 : config.onProgress) === null ||
    _c === void 0
      ? void 0
      : _c.call(config, this._progress[key]);
    this._scheduledOperations.push(async (batch_id, onProgress) => {
      var _a, _b, _c;
      await readable.open();
      const chunkCount = Math.ceil(readable.length / this._maxChunkSize);
      const chunkIds = await Promise.all(
        Array.from({ length: chunkCount }).map(async (_, index) => {
          var _a;
          const content = await readable.slice(
            index * this._maxChunkSize,
            Math.min((index + 1) * this._maxChunkSize, readable.length),
          );
          if (!(config === null || config === void 0 ? void 0 : config.sha256)) {
            this._sha256[key].update(content);
          }
          const { chunk_id } = await this._limit(() =>
            this._actor.create_chunk({
              content,
              batch_id,
            }),
          );
          this._progress[key].current += content.length;
          (_a = config === null || config === void 0 ? void 0 : config.onProgress) === null ||
          _a === void 0
            ? void 0
            : _a.call(config, this._progress[key]);
          onProgress === null || onProgress === void 0
            ? void 0
            : onProgress({
                current: Object.values(this._progress).reduce((acc, val) => acc + val.current, 0),
                total: Object.values(this._progress).reduce((acc, val) => acc + val.total, 0),
              });
          return chunk_id;
        }),
      );
      await readable.close();
      return [
        {
          CreateAsset: {
            key,
            content_type:
              (_a = config === null || config === void 0 ? void 0 : config.contentType) !== null &&
              _a !== void 0
                ? _a
                : readable.contentType,
          },
        },
        {
          SetAssetContent: {
            key,
            sha256: [
              (_b = config === null || config === void 0 ? void 0 : config.sha256) !== null &&
              _b !== void 0
                ? _b
                : new Uint8Array(this._sha256[key].arrayBuffer()),
            ],
            chunk_ids: chunkIds,
            content_encoding:
              (_c = config === null || config === void 0 ? void 0 : config.contentEncoding) !==
                null && _c !== void 0
                ? _c
                : 'identity',
          },
        },
      ];
    });
    return key;
  }
  /**
   * Insert batch operation to delete file from assets canister
   * @param key The path to the file on the assets canister e.g. /folder/to/my_file.txt
   */
  delete(key) {
    this._scheduledOperations.push(async () => [{ DeleteAsset: { key } }]);
  }
  /**
   * Commit all batch operations to assets canister
   * @param args Optional arguments with optional progress callback for commit progress
   */
  async commit(args) {
    var _a;
    // Create batch
    const { batch_id } = await this._limit(() => this._actor.create_batch({}));
    // Progress callback
    (_a = args === null || args === void 0 ? void 0 : args.onProgress) === null || _a === void 0
      ? void 0
      : _a.call(args, {
          current: Object.values(this._progress).reduce((acc, val) => acc + val.current, 0),
          total: Object.values(this._progress).reduce((acc, val) => acc + val.total, 0),
        });
    // Execute scheduled operations
    const operations = (
      await Promise.all(
        this._scheduledOperations.map(scheduled_operation =>
          scheduled_operation(
            batch_id,
            args === null || args === void 0 ? void 0 : args.onProgress,
          ),
        ),
      )
    ).flat();
    // Commit batch
    await this._limit(() => this._actor.commit_batch({ batch_id, operations }));
    // Cleanup
    this._scheduledOperations = [];
    this._sha256 = {};
    this._progress = {};
  }
}
class Asset {
  constructor(
    _actor,
    _limit,
    _maxSingleFileSize,
    _maxChunkSize,
    _key,
    _acceptEncodings,
    _content,
    contentType,
    length,
    contentEncoding,
    chunkSize,
    sha256,
  ) {
    this._actor = _actor;
    this._limit = _limit;
    this._maxSingleFileSize = _maxSingleFileSize;
    this._maxChunkSize = _maxChunkSize;
    this._key = _key;
    this._acceptEncodings = _acceptEncodings;
    this._content = _content;
    this.contentType = contentType;
    this.length = length;
    this.contentEncoding = contentEncoding;
    this.chunkSize = chunkSize;
    this.sha256 = sha256;
  }
  /**
   * Get asset content as blob (web), most browsers are able to use disk storage for larger blobs
   */
  async toBlob() {
    const blobs = Array.from({ length: Math.ceil(this.length / this.chunkSize) });
    await this.getChunks((index, chunk) => (blobs[index] = new Blob([chunk])));
    return new Blob([...blobs]);
  }
  /**
   * Get asset content as unsigned 8-bit integer array, use `toBlob` (web) or `write` (Node.js) for larger files
   */
  async toUint8Array() {
    const bytes = new Uint8Array(this.length);
    await this.getChunks((index, chunk) => bytes.set(chunk, index * this.chunkSize));
    return bytes;
  }
  /**
   * Get asset content as number array, use `toBlob` (web) or `write` (Node.js) for larger files
   */
  async toNumberArray() {
    const chunks = Array.from({ length: Math.ceil(this.length / this.chunkSize) });
    await this.getChunks((index, chunk) => (chunks[index] = Array.from(chunk)));
    return chunks.flat();
  }
  /**
   * Write asset content to file (Node.js)
   * @param path File path to write to
   */
  async write(path) {
    const fd = await new Promise((resolve, reject) =>
      fs_1.default.open(path, 'w', (err, fd) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(fd);
      }),
    );
    await this.getChunks(
      (index, chunk) =>
        new Promise((resolve, reject) =>
          fs_1.default.write(fd, chunk, 0, chunk.length, index * this.chunkSize, err => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          }),
        ),
    );
    await new Promise(resolve => fs_1.default.close(fd, () => resolve()));
  }
  /**
   * Get All chunks of asset through `onChunk` callback, can be used for a custom storage implementation
   * @param onChunk Called on each received chunk
   * @param sequential Chunks are received in sequential order when true or `concurrency` is `1` in config
   */
  async getChunks(onChunk, sequential) {
    onChunk(0, this._content);
    const chunkLimit = sequential ? (0, limit_js_1.limit)(1) : this._limit;
    await Promise.all(
      Array.from({ length: Math.ceil(this.length / this.chunkSize) - 1 }).map((_, index) =>
        chunkLimit(async () => {
          const { content } = await this._actor.get_chunk({
            key: this._key,
            content_encoding: this.contentEncoding,
            index: BigInt(index + 1),
            sha256: this.sha256 ? [this.sha256] : [],
          });
          onChunk(index + 1, content);
        }),
      ),
    );
  }
  /**
   * Check if asset has been certified, which means that the content's hash is in the canister hash tree
   */
  async isCertified() {
    var _a, _b;
    // Below implementation is based on Internet Computer service worker
    const agent =
      (_a = agent_1.Actor.agentOf(this._actor)) !== null && _a !== void 0
        ? _a
        : new agent_1.HttpAgent();
    const canisterId = agent_1.Actor.canisterIdOf(this._actor);
    if (!canisterId) {
      throw Error('Actor is missing canister id');
    }
    if (!agent.rootKey) {
      throw Error('Agent is missing root key');
    }
    const response = await this._limit(() =>
      this._actor.http_request({
        method: 'get',
        url: this._key,
        headers: [['Accept-Encoding', this._acceptEncodings.join(', ')]],
        body: new Uint8Array(),
      }),
    );
    let certificate;
    let tree;
    const certificateHeader = response.headers.find(
      ([key]) => key.trim().toLowerCase() === 'ic-certificate',
    );
    if (!certificateHeader) {
      return false;
    }
    const fields = certificateHeader[1].split(/,/);
    for (const f of fields) {
      const [, name, b64Value] = [
        ...((_b = f.match(/^(.*)=:(.*):$/)) !== null && _b !== void 0 ? _b : []),
      ].map(x => x.trim());
      const value = base64Arraybuffer.decode(b64Value);
      if (name === 'certificate') {
        certificate = value;
      } else if (name === 'tree') {
        tree = value;
      }
    }
    if (!certificate || !tree) {
      // No certificate or tree in response header
      return false;
    }
    const cert = await agent_1.Certificate.create({
      certificate: new Uint8Array(certificate),
      rootKey: agent.rootKey,
      canisterId,
    }).catch(() => Promise.resolve());
    if (!cert) {
      // Certificate is not valid
      return false;
    }
    // Check certificate time
    const decodedTime = (0, candid_1.lebDecode)(
      new candid_2.PipeArrayBuffer(cert.lookup(['time'])),
    );
    const certTime = Number(decodedTime / BigInt(1000000)); // Convert from nanos to millis
    const now = Date.now();
    const maxCertTimeOffset = 300000; // 5 min
    if (certTime - maxCertTimeOffset > now || certTime + maxCertTimeOffset < now) {
      return false;
    }
    const hashTree = agent_1.Cbor.decode(new Uint8Array(tree));
    const reconstructed = await (0, agent_1.reconstruct)(hashTree);
    const witness = cert.lookup(['canister', canisterId.toUint8Array(), 'certified_data']);
    if (!witness) {
      // Could not find certified data for this canister in the certificate
      return false;
    }
    // First validate that the Tree is as good as the certification
    if ((0, agent_1.compare)(witness, reconstructed) !== 0) {
      // Witness != Tree passed in ic-certification
      return false;
    }
    // Lookup hash of asset in tree
    const treeSha = (0, agent_1.lookup_path)(['http_assets', this._key], hashTree);
    return !!treeSha && !!this.sha256 && (0, agent_1.compare)(this.sha256.buffer, treeSha) === 0;
  }
  /**
   * Check if the hash of the asset data is equal to the hash that has been certified
   * @param bytes Optionally pass data to hash instead of waiting for asset data to be fetched and hashed
   */
  async verifySha256(bytes) {
    var _a;
    if (!((_a = this.sha256) === null || _a === void 0 ? void 0 : _a.buffer)) {
      return false;
    }
    const sha256 = js_sha256_1.sha256.create();
    if (bytes) {
      sha256.update(Array.isArray(bytes) ? new Uint8Array(bytes) : bytes);
    } else {
      await this.getChunks((_, chunk) => sha256.update(chunk), true);
    }
    return (0, agent_1.compare)(this.sha256.buffer, sha256.arrayBuffer()) === 0;
  }
}
//# sourceMappingURL=index.js.map
