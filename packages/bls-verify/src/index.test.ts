import { blsVerify } from './index';
import * as Cert from '../../agent/src/certificate';
import * as cbor from '../../agent/src/cbor';
import { fromHex, toHex } from '../../agent/src/utils/buffer';
import { Principal } from '@dfinity/principal';

// Root public key for the IC main net, encoded as hex
const IC_ROOT_KEY =
  '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100814' +
  'c0e6ec71fab583b08bd81373c255c3c371b2e84863c98a4f1e08b74235d14fb5d9c0cd546d968' +
  '5f913a0c0b2cc5341583bf4b4392e467db96d65b9bb4cb717112f8472e0d5a4d14505ffd7484' +
  'b01291091c5f87b98883463f98091a0baaae';

// The sample certificate for testing delegation is extracted from the response used in agent-rs tests, where they were taken
// from an interaction with the IC mainnet.
const SAMPLE_CERT =
  'd9d9f7a364747265658301830182045820250f5e26868d9c1ea7ab29cbe9c15bf1c47c0d7605e803e39e375a7fe09c6ebb830183024e726571756573745f7374617475738301820458204b268227774ec77ff2b37ecb12157329d54cf376694bdd59ded7803efd82386f83025820edad510eaaa08ed2acd4781324e6446269da6753ec17760f206bbe81c465ff528301830183024b72656a6563745f636f64658203410383024e72656a6563745f6d6573736167658203584443616e69737465722069766733372d71696161612d61616161622d61616167612d63616920686173206e6f20757064617465206d6574686f64202772656769737465722783024673746174757382034872656a65637465648204582097232f31f6ab7ca4fe53eb6568fc3e02bc22fe94ab31d010e5fb3c642301f1608301820458203a48d1fc213d49307103104f7d72c2b5930edba8787b90631f343b3aa68a5f0a83024474696d65820349e2dc939091c696eb16697369676e6174757265583089a2be21b5fa8ac9fab1527e041327ce899d7da971436a1f2165393947b4d942365bfe5488710e61a619ba48388a21b16a64656c65676174696f6ea2697375626e65745f6964581dd77b2a2f7199b9a8aec93fe6fb588661358cf12223e9a3af7b4ebac4026b6365727469666963617465590231d9d9f7a26474726565830182045820ae023f28c3b9d966c8fb09f9ed755c828aadb5152e00aaf700b18c9c067294b483018302467375626e6574830182045820e83bb025f6574c8f31233dc0fe289ff546dfa1e49bd6116dd6e8896d90a4946e830182045820e782619092d69d5bebf0924138bd4116b0156b5a95e25c358ea8cf7e7161a661830183018204582062513fa926c9a9ef803ac284d620f303189588e1d3904349ab63b6470856fc4883018204582060e9a344ced2c9c4a96a0197fd585f2d259dbd193e4eada56239cac26087f9c58302581dd77b2a2f7199b9a8aec93fe6fb588661358cf12223e9a3af7b4ebac402830183024f63616e69737465725f72616e6765738203581bd9d9f781824a000000000020000001014a00000000002fffff010183024a7075626c69635f6b657982035885308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c050302010361009933e1f89e8a3c4d7fdcccdbd518089e2bd4d8180a261f18d9c247a52768ebce98dc7328a39814a8f911086a1dd50cbe015e2a53b7bf78b55288893daa15c346640e8831d72a12bdedd979d28470c34823b8d1c3f4795d9c3984a247132e94fe82045820996f17bb926be3315745dea7282005a793b58e76afeb5d43d1a28ce29d2d158583024474696d6582034995b8aac0e4eda2ea16697369676e61747572655830ace9fcdd9bc977e05d6328f889dc4e7c99114c737a494653cb27a1f55c06f4555e0f160980af5ead098acc195010b2f7';

beforeEach(() => {
  jest.setTimeout(10_000);
});
test('delegation works for canisters within the subnet range', async () => {
  // The certificate specifies the range from
  // 0x00000000002000000101
  // to
  // 0x00000000002FFFFF0101
  const rangeStart = Principal.fromHex('00000000002000000101');
  const rangeInterior = Principal.fromHex('000000000020000C0101');
  const rangeEnd = Principal.fromHex('00000000002FFFFF0101');
  async function verifies(canisterId) {
    await expect(
      Cert.Certificate.create({
        certificate: fromHex(SAMPLE_CERT),
        rootKey: fromHex(IC_ROOT_KEY),
        canisterId: canisterId,
        blsVerify,
      }),
    ).resolves.not.toThrow();
  }
  await verifies(rangeStart);
  await verifies(rangeInterior);
  await verifies(rangeEnd);
});

test('delegation check fails for canisters outside of the subnet range', async () => {
  // Use a different principal than the happy path, which isn't in the delegation ranges.
  // The certificate specifies the range from
  // 0x00000000002000000101
  // to
  // 0x00000000002FFFFF0101
  const beforeRange = Principal.fromHex('00000000000000020101');
  const afterRange = Principal.fromHex('00000000003000020101');
  async function certificateFails(canisterId) {
    await expect(
      Cert.Certificate.create({
        certificate: fromHex(SAMPLE_CERT),
        rootKey: fromHex(IC_ROOT_KEY),
        canisterId: canisterId,
        blsVerify,
      }),
    ).rejects.toThrow(/Invalid certificate/);
  }
  await certificateFails(beforeRange);
  await certificateFails(afterRange);
});

type FakeCert = {
  tree: Cert.HashTree;
  signature: ArrayBuffer;
  delegation?: { subnet_id: ArrayBuffer; certificate: ArrayBuffer };
};

test('certificate verification fails for an invalid signature', async () => {
  const badCert: FakeCert = cbor.decode(fromHex(SAMPLE_CERT));
  badCert.signature = new ArrayBuffer(badCert.signature.byteLength);
  const badCertEncoded = cbor.encode(badCert);
  await expect(
    Cert.Certificate.create({
      certificate: badCertEncoded,
      rootKey: fromHex(IC_ROOT_KEY),
      canisterId: Principal.fromText('ivg37-qiaaa-aaaab-aaaga-cai'),
      blsVerify,
    }),
  ).rejects.toThrow('Invalid certificate');
});

test('verify', async () => {
  const pk =
    'a7623a93cdb56c4d23d99c14216afaab3dfd6d4f9eb3db23d038280b6d5cb2caaee2a19dd92c9df7001d' +
    'ede23bf036bc0f33982dfb41e8fa9b8e96b5dc3e83d55ca4dd146c7eb2e8b6859cb5a5db815db86810b8' +
    'd12cee1588b5dbf34a4dc9a5';
  const sig =
    'b89e13a212c830586eaa9ad53946cd968718ebecc27eda849d9232673dcd4f440e8b5df39bf14a88048c15e16cbcaabe';
  const msg = Buffer.from('hello').toString('hex');
  expect(await blsVerify(pk, sig, msg)).toBe(true);
  expect(await blsVerify(pk, sig, Buffer.from('hallo').toString('hex'))).toBe(false);
}, 10000); // Default timer is flaky with WASM.
