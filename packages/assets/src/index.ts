import {
  Actor,
  ActorConfig,
  ActorSubclass,
  Cbor as cbor,
  Certificate,
  compare,
  getDefaultAgent,
  HashTree,
  lookup_path,
  reconstruct,
} from '@dfinity/agent';
import { lebDecode } from '@dfinity/candid';
import { PipeArrayBuffer } from '@dfinity/candid/lib/cjs/utils/buffer';
import { AssetsCanisterRecord, getAssetsCanister } from './canisters/assets';
import { Hasher, sha256 as jsSha256 } from 'js-sha256';
import { BatchOperationKind } from './canisters/assets_service';
import * as base64Arraybuffer from 'base64-arraybuffer';
import { isReadable, Readable } from './readable/readable';
import { ReadableFile } from './readable/readableFile';
import { ReadableBlob } from './readable/readableBlob';
import { ReadablePath } from './readable/readablePath';
import { ReadableBytes } from './readable/readableBytes';
import { limit, LimitFn } from './utils/limit';
import fs from 'fs';

/**
 * Supported content encodings by asset canister
 */
export type ContentEncoding = 'identity' | 'gzip' | 'compress' | 'deflate' | 'br';

/**
 * Upload progress in bytes
 */
export interface Progress {
  current: number;
  total: number;
}

/**
 * Configuration that can be passed to override defaults and add progress callback
 */
export interface StoreConfig {
  fileName?: string;
  path?: string;
  contentType?: string;
  contentEncoding?: ContentEncoding;
  sha256?: Uint8Array;
  onProgress?: (progress: Progress) => void;
}

export type StoreReadableArgs = [readable: Readable, config?: StoreConfig];

export type StoreFileArgs = [file: File, config?: StoreConfig];

export type StoreBlobArgs = [
  blob: Blob,
  config: Omit<StoreConfig, 'fileName'> & Required<Pick<StoreConfig, 'fileName'>>,
];

export type StorePathArgs = [path: string, config?: StoreConfig];

export type StoreBytesArgs = [
  bytes: Uint8Array | number[],
  config: Omit<StoreConfig, 'fileName'> & Required<Pick<StoreConfig, 'fileName'>>,
];

/**
 * Arguments to store an asset in asset manager
 */
export type StoreArgs =
  | StoreReadableArgs
  | StoreFileArgs
  | StoreBlobArgs
  | StorePathArgs
  | StoreBytesArgs;

/**
 * Arguments to commit batch in asset manager
 */
export interface CommitBatchArgs {
  onProgress?: (progress: Progress) => void;
}

/**
 * Configuration that can be passed to set the canister id of the
 * assets canister to be managed, inherits actor configuration and
 * has additional asset manager specific configuration options.
 */
export interface AssetManagerConfig extends ActorConfig {
  /**
   * Max number of concurrent requests to the Internet Computer
   */
  concurrency?: number;
  /**
   * Max file size in bytes that the asset manager shouldn't chunk
   */
  maxSingleFileSize?: number;
  /**
   * Size of each chunk in bytes when the asset manager has to chunk a file
   */
  maxChunkSize?: number;
}

export class AssetManager {
  private readonly _actor: ActorSubclass<AssetsCanisterRecord>;
  private readonly _limit: LimitFn;
  private readonly _maxSingleFileSize: number;
  private readonly _maxChunkSize: number;

  /**
   * Create assets canister manager instance
   * @param config Additional configuration options, canister id is required
   */
  constructor({
    concurrency,
    maxSingleFileSize,
    maxChunkSize,
    ...actorConfig
  }: AssetManagerConfig) {
    this._actor = getAssetsCanister(actorConfig);
    this._limit = limit(concurrency ?? 16);
    this._maxSingleFileSize = maxSingleFileSize ?? 1900000;
    this._maxChunkSize = maxChunkSize ?? 1900000;
  }

  /**
   * Create readable from store arguments
   * @param args Arguments with either a file, blob, path, bytes or custom Readable implementation
   */
  static async toReadable(...args: StoreArgs): Promise<Readable> {
    if (args[0] instanceof File) {
      return new ReadableFile(args[0]);
    }
    if (args[0] instanceof Blob && args[1]?.fileName) {
      return new ReadableBlob(args[1].fileName, args[0]);
    }
    if (typeof args[0] === 'string') {
      return await ReadablePath.create(args[0]);
    }
    if ((Array.isArray(args[0]) || args[0]?.constructor === Uint8Array) && args[1]?.fileName) {
      return new ReadableBytes(args[1].fileName, args[0]);
    }
    if (isReadable(args[0])) {
      return args[0];
    }

    throw new Error('Invalid arguments, readable could not be created');
  }

  /**
   * Get list of all files in assets canister
   * @return All files in asset canister
   */
  public async list(): ReturnType<AssetsCanisterRecord['list']> {
    return this._actor.list({});
  }

  /**
   * Store data on assets canister
   * @param args Arguments with either a file, blob, path, bytes or custom Readable implementation
   */
  public async store(...args: StoreArgs): Promise<string> {
    const readable = await AssetManager.toReadable(...args);
    const [, config] = args;
    const key = [config?.path ?? '', config?.fileName ?? readable.fileName].join('/');

    if (readable.length <= this._maxSingleFileSize) {
      // Asset is small enough to be uploaded in one request
      await this._limit(async () => {
        await readable.open();
        const bytes = await readable.slice(0, readable.length);
        await readable.close();
        const sha256 =
          config?.sha256 ??
          new Uint8Array(jsSha256.create().update(new Uint8Array(bytes)).arrayBuffer());
        return this._actor.store({
          key,
          content: bytes,
          content_type: readable.contentType,
          sha256: [sha256],
          content_encoding: config?.contentEncoding ?? 'identity',
        });
      });
      // Call progress callback for consistent behavior even though there is only a single chunk
      config?.onProgress?.({ current: readable.length, total: readable.length });
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
  public async delete(key: string): Promise<void> {
    await this._actor.delete_asset({ key });
  }

  /**
   * Delete all files from assets canister
   */
  public async clear(): Promise<void> {
    await this._actor.clear({});
  }

  /**
   * Get asset instance from assets canister
   * @param key The path to the file on the assets canister e.g. /folder/to/my_file.txt
   * @param acceptEncodings The accepted content encodings, defaults to ['identity']
   */
  public async get(key: string, acceptEncodings?: ContentEncoding[]): Promise<Asset> {
    const data = await this._actor.get({
      key,
      accept_encodings: acceptEncodings ?? ['identity'],
    });

    return new Asset(
      this._actor,
      this._limit,
      this._maxSingleFileSize,
      this._maxChunkSize,
      key,
      acceptEncodings ?? ['identity'],
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
  public batch(): AssetManagerBatch {
    return new AssetManagerBatch(this._actor, this._limit, this._maxChunkSize);
  }
}

class AssetManagerBatch {
  private _scheduledOperations: Array<
    (batch_id: bigint, onProgress?: (progress: Progress) => void) => Promise<BatchOperationKind[]>
  > = [];
  private _sha256: { [key: string]: Hasher } = {};
  private _progress: { [key: string]: Progress } = {};

  constructor(
    private readonly _actor: ActorSubclass<AssetsCanisterRecord>,
    private readonly _pLimit: LimitFn,
    private readonly _maxChunkSize: number,
  ) {}

  /**
   * Insert batch operation to store data on assets canister
   * @param args Arguments with either a file, blob, path, bytes or custom Readable implementation
   */
  public async store(...args: StoreArgs): Promise<string> {
    const readable = await AssetManager.toReadable(...args);
    const [, config] = args;
    const key = [config?.path ?? '', config?.fileName ?? readable.fileName].join('/');
    if (!config?.sha256) {
      this._sha256[key] = jsSha256.create();
    }
    this._progress[key] = { current: 0, total: readable.length };
    this._scheduledOperations.push(async (batch_id, onProgress) => {
      await readable.open();
      const chunkCount = Math.ceil(readable.length / this._maxChunkSize);
      const chunkIds: bigint[] = await Promise.all(
        Array.from({ length: chunkCount }).map(async (_, index) => {
          const content = await readable.slice(
            index * this._maxChunkSize,
            Math.min((index + 1) * this._maxChunkSize, readable.length),
          );
          if (!config?.sha256) {
            this._sha256[key].update(content);
          }
          const { chunk_id } = await this._pLimit(() =>
            this._actor.create_chunk({
              content,
              batch_id,
            }),
          );
          this._progress[key].current += content.length;

          // Individual progress callback
          config?.onProgress?.(this._progress[key]);

          // Whole commit progress callback
          onProgress?.({
            current: Object.values(this._progress).reduce((acc, val) => acc + val.current, 0),
            total: Object.values(this._progress).reduce((acc, val) => acc + val.total, 0),
          });

          return chunk_id;
        }),
      );
      await readable.close();
      return [
        {
          CreateAsset: { key, content_type: config?.contentType ?? readable.contentType },
        },
        {
          SetAssetContent: {
            key,
            sha256: [config?.sha256 ?? new Uint8Array(this._sha256[key].arrayBuffer())],
            chunk_ids: chunkIds,
            content_encoding: config?.contentEncoding ?? 'identity',
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
  public delete(key: string): void {
    this._scheduledOperations.push(async () => [{ DeleteAsset: { key } }]);
  }

  /**
   * Commit all batch operations to assets canister
   */
  public async commit(args?: CommitBatchArgs): Promise<void> {
    // Create batch
    const { batch_id } = await this._pLimit(() => this._actor.create_batch({}));

    // Execute scheduled operations
    const operations = (
      await Promise.all(
        this._scheduledOperations.map(scheduled_operation =>
          scheduled_operation(batch_id, args?.onProgress),
        ),
      )
    ).flat();

    // Commit batch
    await this._pLimit(() => this._actor.commit_batch({ batch_id, operations }));

    // Cleanup
    this._scheduledOperations = [];
    this._sha256 = {};
    this._progress = {};
  }
}

class Asset {
  constructor(
    private readonly _actor: ActorSubclass<AssetsCanisterRecord>,
    private readonly _limit: LimitFn,
    private readonly _maxSingleFileSize: number,
    private readonly _maxChunkSize: number,
    private readonly _key: string,
    private readonly _acceptEncodings: ContentEncoding[],
    private readonly _content: Uint8Array,
    public readonly contentType: string,
    public readonly length: number,
    public readonly contentEncoding: string,
    public readonly chunkSize: number,
    public readonly sha256?: Uint8Array,
  ) {}

  /**
   * Get asset content as blob (web), most browsers are able to use disk storage for larger blobs
   */
  public async toBlob(): Promise<Blob> {
    const blobs = Array.from<Blob>({ length: Math.ceil(this.length / this.chunkSize) });
    await this.getChunks((index, chunk) => (blobs[index] = new Blob([chunk])));
    return new Blob([...blobs]);
  }

  /**
   * Get asset content as unsigned 8-bit integer array, use `toBlob` (web) or `write` (Node) for larger files
   */
  public async toUint8Array(): Promise<Uint8Array> {
    const bytes = new Uint8Array(this.length);
    await this.getChunks((index, chunk) => bytes.set(chunk, index * this.chunkSize));
    return bytes;
  }

  /**
   * Get asset content as number array, use `toBlob` (web) or `write` (Node) for larger files
   */
  public async toNumberArray(): Promise<number[]> {
    const chunks = Array.from<number[]>({ length: Math.ceil(this.length / this.chunkSize) });
    await this.getChunks((index, chunk) => (chunks[index] = Array.from(chunk)));
    return chunks.flat();
  }

  /**
   * Write asset content to file (Node)
   */
  public async write(path: string): Promise<void> {
    const fd = await new Promise<number>(async (resolve, reject) =>
      fs.open(path, 'w', (err: any, fd: number) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(fd);
      }),
    );
    await this.getChunks(
      (index, chunk) =>
        new Promise<void>((resolve, reject) =>
          fs.write(fd, chunk, 0, chunk.length, index * this.chunkSize, (err: any) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          }),
        ),
    );
  }

  /**
   * Get All chunks of asset through `onChunk` callback, can be used for a custom storage implementation
   * @param onChunk Called on each received chunk
   * @param sequential Chunks are received in sequential order when true or `concurrency` is `1` in config
   */
  public async getChunks(
    onChunk: (index: number, chunk: Uint8Array) => void,
    sequential?: boolean,
  ) {
    onChunk(0, this._content);
    const chunkLimit = sequential ? limit(1) : this._limit;
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
  public async isCertified(): Promise<boolean> {
    // Below implementation is based on Internet Computer service worker
    const agent = Actor.agentOf(this._actor) ?? getDefaultAgent();
    const canisterId = Actor.canisterIdOf(this._actor);

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

    let certificate: ArrayBuffer | undefined;
    let tree: ArrayBuffer | undefined;
    let encoding = '';
    for (const [key, value] of response.headers) {
      switch (key.trim().toLowerCase()) {
        case 'ic-certificate':
          {
            const fields = value.split(/,/);
            for (const f of fields) {
              // @ts-ignore
              const [, name, b64Value] = [...f.match(/^(.*)=:(.*):$/)].map(x => x.trim());
              const value = base64Arraybuffer.decode(b64Value);
              if (name === 'certificate') {
                certificate = value;
              } else if (name === 'tree') {
                tree = value;
              }
            }
          }
          continue;
        case 'content-encoding':
          encoding = value.trim();
          break;
      }
    }

    if (!tree) {
      // No tree in response header
      return false;
    }

    const cert = await Certificate.create({
      certificate: new Uint8Array(certificate!),
      rootKey: agent.rootKey,
      canisterId,
    }).catch(() => {});

    if (!cert) {
      // Certificate is not valid
      return false;
    }

    // Check certificate time
    const decodedTime = lebDecode(new PipeArrayBuffer(cert.lookup(['time'])));
    const certTime = Number(decodedTime / BigInt(1_000_000)); // Convert from nanos to millis
    const now = Date.now();
    const maxCertTimeOffset = 300_000; // 5 min
    if (certTime - maxCertTimeOffset > now || certTime + maxCertTimeOffset < now) {
      return false;
    }

    const hashTree: HashTree = cbor.decode(new Uint8Array(tree));
    const reconstructed = await reconstruct(hashTree);
    const witness = cert.lookup(['canister', canisterId.toUint8Array(), 'certified_data']);

    if (!witness) {
      // Could not find certified data for this canister in the certificate
      return false;
    }

    // First validate that the Tree is as good as the certification
    if (compare(witness, reconstructed) !== 0) {
      // Witness != Tree passed in ic-certification
      return false;
    }

    // Lookup hash of asset in tree
    const treeSha = lookup_path(['http_assets', this._key], hashTree);

    return !!treeSha && !!this.sha256 && compare(this.sha256.buffer, treeSha) === 0;
  }

  /**
   * Check if the hash of the asset data is equal to the hash that has been certified
   * @param bytes Optionally pass data to hash instead of waiting for asset data to be fetched and hashed
   */
  public async verifySha256(bytes?: Uint8Array | number[]): Promise<boolean> {
    if (!this.sha256?.buffer) {
      return false;
    }
    const sha256 = jsSha256.create();
    if (bytes) {
      sha256.update(Array.isArray(bytes) ? new Uint8Array(bytes) : bytes);
    } else {
      await this.getChunks((_, chunk) => sha256.update(chunk), true);
    }
    return compare(this.sha256.buffer, sha256.arrayBuffer()) === 0;
  }
}
