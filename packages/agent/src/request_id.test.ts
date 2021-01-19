// tslint:disable-next-line: max-line-length
// https://github.com/dfinity-lab/dfinity/blob/5fef1450c9ab16ccf18381379149e504b11c8218/docs/spec/public/index.adoc#request-ids

import { Buffer } from 'buffer/';
import { hash, requestIdOf } from './request_id';
import { BinaryBlob, blobToHex, blobFromHex, blobFromBuffer, blobFromUint8Array } from './types';
import BigNumber from 'bignumber.js';

const testHashOfBlob = async (input: BinaryBlob, expected: string) => {
  const hashed = await hash(input);
  const hex = blobToHex(hashed);
  expect(hex).toBe(expected);
};

const testHashOfString = async (input: string, expected: string) => {
  const encoded: Uint8Array = new TextEncoder().encode(input);
  return testHashOfBlob(encoded as BinaryBlob, expected);
};

// This is based on the intermediate hashes of the request components from
// example in the spec.
test('hash', async () => {
  await testHashOfString(
    'request_type',
    '769e6f87bdda39c859642b74ce9763cdd37cb1cd672733e8c54efaa33ab78af9',
  );
  await testHashOfString(
    'call',
    '7edb360f06acaef2cc80dba16cf563f199d347db4443da04da0c8173e3f9e4ed',
  );
  await testHashOfString(
    'callee', // The "canister_id" field was previously named "callee"
    '92ca4c0ced628df1e7b9f336416ead190bd0348615b6f71a64b21d1b68d4e7e2',
  );
  await testHashOfString(
    'canister_id',
    '0a3eb2ba16702a387e6321066dd952db7a31f9b5cc92981e0a92dd56802d3df9',
  );
  await testHashOfBlob(
    Buffer.from([0, 0, 0, 0, 0, 0, 4, 210]) as BinaryBlob,
    '4d8c47c3c1c837964011441882d745f7e92d10a40cef0520447c63029eafe396',
  );
  await testHashOfString(
    'method_name',
    '293536232cf9231c86002f4ee293176a0179c002daa9fc24be9bb51acdd642b6',
  );
  await testHashOfString(
    'hello',
    '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  );
  await testHashOfString('arg', 'b25f03dedd69be07f356a06fe35c1b0ddc0de77dcd9066c4be0c6bbde14b23ff');
  await testHashOfBlob(
    Buffer.from([68, 73, 68, 76, 0, 253, 42]) as BinaryBlob,
    '6c0b2ae49718f6995c02ac5700c9c789d7b7862a0d53e6d40a73f1fcd2f70189',
  );
});

// This is based on the example in the spec.
test('requestIdOf', async () => {
  const request = {
    request_type: 'call',
    method_name: 'hello',

    // 0x00000000000004D2
    // \x00\x00\x00\x00\x00\x00\x04\xD2
    // 0   0   0   0   0   0   4   210
    canister_id: Buffer.from([0, 0, 0, 0, 0, 0, 4, 210]) as BinaryBlob,

    // DIDL\x00\xFD*
    // D   I   D   L   \x00  \253  *
    // 68  73  68  76  0     253   42
    arg: Buffer.from([68, 73, 68, 76, 0, 253, 42]) as BinaryBlob,
  };

  const requestId = await requestIdOf(request);

  expect(blobToHex(requestId)).toEqual(
    '8781291c347db32a9d8c10eb62b710fce5a93be676474c42babc74c51858f94b',
  );
});

test('requestIdOf for sender_delegation signature', async () => {
  // {
  //   "delegation": {
  //     "expiration": {
  //       "type": "BigInt",
  //       "string": "1611173458605000000"
  //     },
  //     "pubkey": {
  //       "type": "Uint8Array",
  //       "hex": "302a300506032b6570032100a70b8132011dc81cb3f7ea16e2074a3c177e73a9374a26ab41a0d26d23ca792d",
  //       "base64": "MCowBQYDK2VwAyEApwuBMgEdyByz9+oW4gdKPBd+c6k3SiarQaDSbSPKeS0=",
  //       "utf8": "0*0\u0005\u0006\u0003+ep\u0003!\u0000�\u000b�2\u0001\u001d�\u001c���\u0016�\u0007J<\u0017~s�7J&�A��m#�y-"
  //     },
  //     "targets": [
  //       "kt247-naaaa-aaaab-qabgq-cai",
  //       "pbh67-jaaaa-aaaab-aaavq-cai"
  //     ]
  //   },
  //   "signature": {
  //     "type": "Uint8Array",
  //     "hex": "d9d9f7a3697369676e617475726558473045022100aee1313c0ae440d5a838bd3979df26f00aa8b7a16bec2482aa456390d24b80e702202d3fb8db1fd6331c45972c32f463ba7e4c169941161dd28ca54dcf7b0982c32a70636c69656e745f646174615f6a736f6e78e37b226368616c6c656e6765223a22476d6c6a4c584a6c6358566c63335174595856306143316b5a57786c5a324630615739756c717147584c5543793043532d2d624d4e6d52634c673374346c7576566b7442345a647a454b7269447163222c22636c69656e74457874656e73696f6e73223a7b7d2c2268617368416c676f726974686d223a225348412d323536222c226f726967696e223a2268747470733a2f2f6964656e746974792d70726f76696465722e73646b2d746573742e6466696e6974792e6e6574776f726b222c2274797065223a22776562617574686e2e676574227d7261757468656e74696361746f725f646174615825961c53806e2aa548714bec77ab09b7d0d2aa837710a7945a1e72949bc3a07e3d0100000006",
  //     "base64": "2dn3o2lzaWduYXR1cmVYRzBFAiEAruExPArkQNWoOL05ed8m8Aqot6Fr7CSCqkVjkNJLgOcCIC0/uNsf1jMcRZcsMvRjun5MFplBFh3SjKVNz3sJgsMqcGNsaWVudF9kYXRhX2pzb25443siY2hhbGxlbmdlIjoiR21sakxYSmxjWFZsYzNRdFlYVjBhQzFrWld4bFoyRjBhVzl1bHFxR1hMVUN5MENTLS1iTU5tUmNMZzN0NGx1dlZrdEI0WmR6RUtyaURxYyIsImNsaWVudEV4dGVuc2lvbnMiOnt9LCJoYXNoQWxnb3JpdGhtIjoiU0hBLTI1NiIsIm9yaWdpbiI6Imh0dHBzOi8vaWRlbnRpdHktcHJvdmlkZXIuc2RrLXRlc3QuZGZpbml0eS5uZXR3b3JrIiwidHlwZSI6IndlYmF1dGhuLmdldCJ9cmF1dGhlbnRpY2F0b3JfZGF0YVgllhxTgG4qpUhxS+x3qwm30NKqg3cQp5RaHnKUm8Ogfj0BAAAABg==",
  //     "utf8": "����isignatureXG0E\u0002!\u0000��1<\n�@ը8�9y�&�\n���k�$��Ec��K��\u0002 -?��\u001f�3\u001cE�,2�c�~L\u0016�A\u0016\u001dҌ�M�{\t��*pclient_data_jsonx�{\"challenge\":\"GmljLXJlcXVlc3QtYXV0aC1kZWxlZ2F0aW9ulqqGXLUCy0CS--bMNmRcLg3t4luvVktB4ZdzEKriDqc\",\"clientExtensions\":{},\"hashAlgorithm\":\"SHA-256\",\"origin\":\"https://identity-provider.sdk-test.dfinity.network\",\"type\":\"webauthn.get\"}rauthenticator_dataX%�\u001cS�n*�HqK�w�\t��Ҫ�w\u0010��Z\u001er��à~=\u0001\u0000\u0000\u0000\u0006"
  //   }
  // }
  const delegation1 = {
    expiration: BigInt("1611173458605000000"),
    pubkey: blobFromHex("302a300506032b6570032100a70b8132011dc81cb3f7ea16e2074a3c177e73a9374a26ab41a0d26d23ca792d"),
    targets: [
      "kt247-naaaa-aaaab-qabgq-cai",
      "pbh67-jaaaa-aaaab-aaavq-cai",
    ]
  };
  // Note: this uses `BigNumber`, which the rest of this lib uses too. Make sure this works before `delegation1` above (with BigInt)
  const delegation2 = {
    expiration: new BigNumber("1611173458605000000"),
    pubkey: blobFromHex("302a300506032b6570032100a70b8132011dc81cb3f7ea16e2074a3c177e73a9374a26ab41a0d26d23ca792d"),
    targets: [
      "kt247-naaaa-aaaab-qabgq-cai",
      "pbh67-jaaaa-aaaab-aaavq-cai",
    ]
  };
  const actualHashBytes = await requestIdOf(delegation2);
  const expectedHashBytes = Uint8Array.from("Ìx\u001e\u0010\u0003\u001f\u009f\u008f·F\\Ò\u007f.\u009cá\u001f®¸ÄË¸ê,pGMj:<Îh", s => s.charCodeAt(0))
  // actual   -> a97e981d9525c72a25e4c71d98b1762e213d8cb14b9a5d52968822f5f4ae2a98
  // expected -> cc781e10031f9f8fb7465cd27f2e9ce11faeb8c4cbb8ea2c70474d6a3a3cce68
  expect(blobToHex(actualHashBytes)).toEqual(blobToHex(blobFromUint8Array(expectedHashBytes)))
})
