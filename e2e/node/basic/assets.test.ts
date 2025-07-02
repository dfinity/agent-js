import { existsSync, readFileSync, unlinkSync } from 'fs';
import path from 'path';
import { makeAgent } from '../utils/agent';
import { Principal } from '@icp-sdk/core/principal';
import { AssetManager } from '@icp-sdk/core/assets';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { utf8ToBytes } from '@noble/hashes/utils';
import { getCanisterId } from '../utils/canisterid';

/**
 * Create (pseudo) random bytes Readable
 * @param fileName File name of Readable
 * @param length Byte length of Readable
 */
const randomBytesReadable = (fileName: string, length: number) => {
  const rand = Math.floor(Math.random() * 10000);
  return {
    fileName,
    contentType: 'application/octet-stream',
    length,

    open: async () => {},

    close: async () => {},
    slice: async (start: number, end: number) => {
      return Uint8Array.from(
        Array.from({ length: end - start }).map((_, i) => {
          const offset = start + i;
          const x = Math.sin(rand + offset) * 10000;
          return Math.floor((x - Math.floor(x)) * 256);
        }),
      );
    },
  };
};

describe('assets', async () => {
  /**
   * File paths used in file read/write tests
   */
  const testFile = {
    source: path.join(__dirname, '../package.json'),
    target: path.join(__dirname, '../package_copy.json'),
  };
  const seed = new Uint8Array(32);
  utf8ToBytes('test').forEach((byte, i) => {
    seed[i] = byte;
  });

  // yields n7obp-cx27z-e4ytc-ipt7n-urffz-txqa5-el2vn-7vpqc-jjoh3-wrob6-bqe
  const identity = Ed25519KeyIdentity.generate(seed);

  const agent = await makeAgent({
    identity,
  });

  let canisterId: Principal;

  const testRandomBytes = async (fileName: string, length: number) => {
    const assetManager = new AssetManager({
      canisterId,
      agent,
    });
    const readable = randomBytesReadable(fileName, length);
    const key = await assetManager.store(readable);
    const asset = await assetManager.get(key);
    const sentData = await readable.slice(0, readable.length);
    const receivedData = await asset.toUint8Array();
    const isCertified = await asset.isCertified();
    const isValidSha = await asset.verifySha256(receivedData);
    await assetManager.delete(key);

    expect(key).toEqual(`/${readable.fileName}`);
    expect(asset.contentType).toEqual(readable.contentType);
    expect(asset.length).toEqual(readable.length);
    expect(Array.from(receivedData).join()).toEqual(Array.from(sentData).join());
    expect(isCertified).toBe(true);
    expect(isValidSha).toBe(true);
    await expect(assetManager.get(key)).rejects.toThrow(/asset not found/);
  };

  beforeEach(async () => {
    canisterId = getCanisterId('assets');
  });

  afterEach(async () => {
    const assetManager = new AssetManager({ canisterId, agent });
    await assetManager.clear();
    if (existsSync(testFile.target)) {
      unlinkSync(testFile.target);
    }
  });

  it(
    'store, get and delete 1MB asset (single chunk)',
    () => testRandomBytes('1MB.bin', 1000000),
    100000,
  );

  it(
    'store, get and delete 3MB asset (multiple chunk)',
    () => testRandomBytes('3MB.bin', 3000000),
    100000,
  );

  it('batch process assets and verify asset list', async () => {
    const assetManager = new AssetManager({ canisterId, agent });
    const batch = assetManager.batch();

    // Initial X asset
    const x = randomBytesReadable('X.bin', 1000);
    await assetManager.store(x);

    // Batch store A and B assets and delete X asset
    const readables = [randomBytesReadable('A.bin', 1000), randomBytesReadable('B.bin', 1000)];
    batch.delete(`/${x.fileName}`);
    await Promise.all(readables.map(readable => batch.store(readable)));
    await batch.commit();
    await expect(
      assetManager.list().then(assets => assets.map(asset => asset.key).sort()),
    ).resolves.toEqual(readables.map(({ fileName }) => `/${fileName}`).sort());
  });

  it('read file from disk, store as asset, get asset, write file to disk and compare files', async () => {
    const assetManager = new AssetManager({
      canisterId,
      agent,
      // Make sure files are read and written in chunks during this test
      maxSingleFileSize: 200,
      maxChunkSize: 200,
    });
    const key = await assetManager.store(testFile.source);
    const asset = await assetManager.get(key);
    await asset.write(testFile.target);

    expect(readFileSync(testFile.target, 'utf8')).toEqual(readFileSync(testFile.source, 'utf8'));
  });
});
