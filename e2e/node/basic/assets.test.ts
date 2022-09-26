/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import path from 'path';
import agent from '../utils/agent';
import { Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { AssetManager } from '@dfinity/assets';

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

jest.setTimeout(60000);
describe('assets', () => {
  let canisterId: Principal;

  const testRandomBytes = async (fileName: string, length: number) => {
    const assetManager = new AssetManager({ canisterId, agent: await agent });
    const readable = randomBytesReadable(fileName, length);
    const key = await assetManager.store({ readable });
    const asset = await assetManager.get(key);
    const sentData = await readable.slice(0, readable.length);
    const receivedData = await asset.toUint8Array();
    const isCertified = await asset.isCertified();
    await assetManager.delete(key);
    expect(key).toEqual(`/${readable.fileName}`);
    expect(asset.contentType).toEqual(readable.contentType);
    expect(asset.length).toEqual(readable.length);
    expect(Array.from(receivedData).join()).toEqual(Array.from(sentData).join());
    expect(isCertified).toBe(true);
    await expect(assetManager.get(key)).rejects.toThrow(/asset not found/);
  };

  beforeAll(async () => {
    const module = readFileSync(path.join(__dirname, '../canisters/assets.wasm'));
    canisterId = await Actor.createCanister({ agent: await agent });
    await Actor.install({ module }, { canisterId, agent: await agent });
  });

  afterEach(async () => {
    const assetManager = new AssetManager({ canisterId, agent: await agent });
    await assetManager.clear();
  });

  it('store, get and delete 1MB asset (single chunk)', () => testRandomBytes('1MB.bin', 1000000));

  it('store, get and delete 3MB asset (multiple chunk)', () => testRandomBytes('3MB.bin', 3000000));

  it('batch process assets and verify asset list', async () => {
    const assetManager = new AssetManager({ canisterId, agent: await agent });
    const batch = assetManager.batch();

    // Initial X asset
    const x = randomBytesReadable('X.bin', 1000);
    await assetManager.store({ readable: x });

    // Batch store A and B assets and delete X asset
    const readables = [randomBytesReadable('A.bin', 1000), randomBytesReadable('B.bin', 1000)];
    await batch.delete(`/${x.fileName}`);
    await Promise.all(readables.map(readable => batch.store({ readable })));
    await batch.commit();
    await expect(
      assetManager.list().then(assets => assets.map(asset => asset.key).sort()),
    ).resolves.toEqual(readables.map(({ fileName }) => `/${fileName}`).sort());
  });
});
