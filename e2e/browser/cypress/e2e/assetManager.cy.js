import { AssetManager } from '@dfinity/assets';
import { HttpAgent } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import ids from '../../.dfx/local/canister_ids.json';

const canisterId = ids.assetstorage.local;

// Returns AssetManager instance with principal:
// 535yc-uxytb-gfk7h-tny7p-vjkoe-i4krp-3qmcl-uqfgr-cpgej-yqtjq-rqe
const setup = async () => {
  const identity = Ed25519KeyIdentity.generate(
    Uint8Array.from(Array.from({ length: 32 }).map(() => 0)),
  );
  const agent = new HttpAgent({ identity });
  await agent.fetchRootKey();
  const assetManager = new AssetManager({ canisterId, agent });
  return { assetManager };
};

// Returns ReadableData implementation that returns pseudo random bytes
const randomReadableData = length => {
  const rand = Math.floor(Math.random() * 10000);
  return {
    fileName: 'data.bin',
    path: '',
    contentType: 'application/octet-stream',
    length,
    contentEncoding: 'identity',
    open: () => Promise.resolve(),
    close: () => Promise.resolve(),
    slice: async (start, end) => {
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

describe('AssetManager tests', () => {
  afterEach(async () => {
    const { assetManager } = await setup();
    await assetManager.clear();
  });
  it('1MB asset (single chunk)', () => {
    cy.visit('http://localhost:1234');
    cy.window().then({ timeout: 10000 }, async window => {
      const { assetManager } = await setup();
      const randomBytes = randomReadableData(1000000);
      randomBytes.fileName = '1MB.bin';
      const key = await assetManager.store(randomBytes);
      const asset = await assetManager.get(key);
      const sentData = await randomBytes.slice(0, randomBytes.length);
      const receivedData = await asset.toUint8Array();
      const isCertified = await asset.isCertified();

      expect(key).to.equal([randomBytes.path, randomBytes.fileName].join('/'));
      expect(asset.contentType).to.equal(randomBytes.contentType);
      expect(asset.length).to.equal(randomBytes.length);
      expect(asset.contentEncoding).to.equal(randomBytes.contentEncoding);
      expect(Array.from(receivedData).join()).to.equal(Array.from(sentData).join());
      expect(isCertified).to.equal(true);
    });
  });
  it('3MB asset (multiple chunks)', () => {
    cy.visit('http://localhost:1234');
    cy.window().then({ timeout: 20000 }, async window => {
      const { assetManager } = await setup();
      const randomBytes = randomReadableData(3000000);
      randomBytes.fileName = '3MB.bin';
      const key = await assetManager.store(randomBytes);
      const asset = await assetManager.get(key);
      const sentData = await randomBytes.slice(0, randomBytes.length);
      const receivedData = await asset.toUint8Array();
      const isCertified = await asset.isCertified();

      expect(key).to.equal([randomBytes.path, randomBytes.fileName].join('/'));
      expect(asset.contentType).to.equal(randomBytes.contentType);
      expect(asset.length).to.equal(randomBytes.length);
      expect(asset.contentEncoding).to.equal(randomBytes.contentEncoding);
      expect(Array.from(receivedData).join()).to.equal(Array.from(sentData).join());
      expect(isCertified).to.equal(true);
    });
  });
});
