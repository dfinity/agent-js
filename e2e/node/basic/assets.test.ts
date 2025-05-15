import { existsSync, readFileSync, unlinkSync } from 'fs';
import path from 'path';
import agent from '../utils/agent';
import { Principal } from '@dfinity/principal';
import { AssetManager } from '@dfinity/assets';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Actor, HttpAgent } from '@dfinity/agent';
import { execSync } from 'child_process';

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
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    open: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
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

/**
 * Create a reproducible identity from a seed string
 */
function createTestIdentity() {
  // Convert 'test' to Uint8Array (seed)
  const seed = new TextEncoder().encode('test');
  // Pad to required length (32 bytes)
  const paddedSeed = new Uint8Array(32);
  paddedSeed.set(seed);

  return Ed25519KeyIdentity.generate(paddedSeed);
}

/**
 * File paths used in file read/write tests
 */
const testFile = {
  source: path.join(__dirname, '../package.json'),
  target: path.join(__dirname, '../package_copy.json'),
};

describe('assets', () => {
  let canisterId: Principal;
  let testIdentity: Ed25519KeyIdentity;
  let testAgent: HttpAgent;

  const testRandomBytes = async (fileName: string, length: number) => {
    const assetManager = new AssetManager({
      canisterId,
      agent: testAgent,
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

  beforeAll(async () => {
    // Use the hardcoded assets canister ID
    const assetsCanisterId =
      process.env.ASSETS_CANISTER_ID || execSync('dfx canister id assets').toString().trim();
    canisterId = Principal.fromText(assetsCanisterId);

    // Create a reproducible identity for our tests
    testIdentity = createTestIdentity();

    // Create an agent with this identity
    testAgent = new HttpAgent({
      host: 'http://localhost:4943',
      identity: testIdentity,
    });
    await testAgent.fetchRootKey();

    // Get the default agent for authorization
    const defaultAgent = await agent;

    // Authorize our test identity on the assets canister
    // Create a simple IDL factory for the authorize method
    const idlFactory = ({ IDL }) => {
      return IDL.Service({
        authorize: IDL.Func([IDL.Principal], [], []),
      });
    };

    const authorizeActor = Actor.createActor(idlFactory, {
      agent: defaultAgent,
      canisterId,
    });

    try {
      await authorizeActor.authorize(testIdentity.getPrincipal());
      console.log(`Authorized test identity: ${testIdentity.getPrincipal().toString()}`);
    } catch (error) {
      console.error(`Failed to authorize test identity: ${error}`);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      // Use the test identity's agent to clean up with clear()
      const assetManager = new AssetManager({
        canisterId,
        agent: testAgent,
      });

      // Now we can use clear() since we have the proper permissions
      await assetManager.clear();

      if (existsSync(testFile.target)) {
        unlinkSync(testFile.target);
      }
    } catch (error) {
      console.error(`Cleanup failed: ${error}`);
      // Don't fail tests on cleanup errors
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
    const assetManager = new AssetManager({ canisterId, agent: testAgent });
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
      agent: testAgent,
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
