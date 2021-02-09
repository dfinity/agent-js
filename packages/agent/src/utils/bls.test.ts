/**
 * @jest-environment node
 */

import { BLS } from './bls';

test('verify', async () => {
  const pk = Uint8Array.from(
    Buffer.from('a7623a93cdb56c4d23d99c14216afaab3dfd6d4f9eb3db23d038280b6d5cb2caaee2a19dd92c9df7001d' +
    'ede23bf036bc0f33982dfb41e8fa9b8e96b5dc3e83d55ca4dd146c7eb2e8b6859cb5a5db815db86810b8' +
                'd12cee1588b5dbf34a4dc9a5', 'hex'));
  const sig = Uint8Array.from(
    Buffer.from('b89e13a212c830586eaa9ad53946cd968718ebecc27eda849d9232673dcd4f440e8b5df39bf14a88048c15e16cbcaabe', 'hex'));
  const msg = Uint8Array.from(Buffer.from('hello'));
  expect(await BLS.blsVerify(pk, sig, msg)).toBe(true);
  expect(await BLS.blsVerify(pk, sig, Uint8Array.from(Buffer.from('hallo')))).toBe(false);
}, 10000); // Default timer is flaky with WASM.
