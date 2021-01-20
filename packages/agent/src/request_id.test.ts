// tslint:disable-next-line: max-line-length
// https://github.com/dfinity-lab/dfinity/blob/5fef1450c9ab16ccf18381379149e504b11c8218/docs/spec/public/index.adoc#request-ids

import { Buffer } from 'buffer/';
import { hash, requestIdOf } from './request_id';
import { BinaryBlob, blobToHex, blobFromHex, blobFromBuffer, blobFromUint8Array } from './types';
import BigNumber from 'bignumber.js';
import { Principal } from './principal';

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
  // this is what replica wants
  const expectedHashBytes = Uint8Array.from(
    'Ìx\u001e\u0010\u0003\u001f\u009f\u008f·F\\Ò\u007f.\u009cá\u001f®¸ÄË¸ê,pGMj:<Îh',
    s => s.charCodeAt(0),
  );
  const delegation1 = {
    expiration: BigInt('1611173458605000000'),
    pubkey: blobFromHex(
      '302a300506032b6570032100a70b8132011dc81cb3f7ea16e2074a3c177e73a9374a26ab41a0d26d23ca792d',
    ),
    targets: ['kt247-naaaa-aaaab-qabgq-cai', 'pbh67-jaaaa-aaaab-aaavq-cai'],
  };
  const delegation1ActualHashBytes = await requestIdOf(delegation1);
  // actual   -> a97e981d9525c72a25e4c71d98b1762e213d8cb14b9a5d52968822f5f4ae2a98
  // expected -> cc781e10031f9f8fb7465cd27f2e9ce11faeb8c4cbb8ea2c70474d6a3a3cce68
  //   (according to replica error message https://github.com/dfinity/webauthn_tester/issues/105)
  expect(blobToHex(delegation1ActualHashBytes)).toEqual(
    blobToHex(blobFromUint8Array(expectedHashBytes)),
  );


  // Note: this uses `BigNumber`, which the rest of this lib uses too. Make sure this works before `delegation1` above (with BigInt)
  const delegation2 = {
    ...delegation1,
    expiration: new BigNumber(delegation1.expiration.toString(10), 10),
  };
  const delegation2ActualHashBytes = await requestIdOf(delegation2);
  expect(blobToHex(delegation2ActualHashBytes)).toEqual(
    blobToHex(blobFromUint8Array(delegation1ActualHashBytes)),
  );


  const delegation3 = {
    ...delegation1,
    targets: delegation1.targets.map(t => (Principal.fromText(t).toBlob())),
  }
  /**
  delegation3 = {
    expiration: 1611173458605000000n,
    pubkey: <Buffer 30 2a 30 05 06 03 2b 65 70 03 21 00 a7 0b 81 32 01 1d c8 1c b3 f7 ea 16 e2 07 4a 3c 17 7e 73 a9 37 4a 26 ab 41 a0 d2 6d 23 ca 79 2d>,
    targets: [
      <Buffer 00 00 00 00 00 30 00 4d 01 01>,
      <Buffer 00 00 00 00 00 20 00 2b 01 01>
    ]
  }
   */
  const delegation3ActualHashBytes = await requestIdOf(delegation3)
  // actual: 96aa865cb502cb4092fbe6cc36645c2e0dede25baf564b41e1977310aae20ea7
  expect(blobToHex(delegation3ActualHashBytes)).toEqual(blobToHex(blobFromUint8Array(expectedHashBytes)))

  
  const delegation4 = {
    ...delegation3,
    pubkey: Uint8Array.from(delegation3.pubkey),
    targets: delegation3.targets.map(buf => Uint8Array.from(buf))
  };
  /**
  delegation4 = {
      expiration: 1611173458605000000n,
      pubkey: Uint8Array(44) [
          48,  42,  48,  5,   6,   3, 43, 101, 112,   3,
          33,   0, 167, 11, 129,  50,  1,  29, 200,  28,
        179, 247, 234, 22, 226,   7, 74,  60,  23, 126,
        115, 169,  55, 74,  38, 171, 65, 160, 210, 109,
          35, 202, 121, 45
      ],
      targets: [ [Uint8Array], [Uint8Array] ]
  }
  */
  const delegation4ActualHashBytes = await requestIdOf(delegation4)
  // actual: 96aa865cb502cb4092fbe6cc36645c2e0dede25baf564b41e1977310aae20ea7
  expect(blobToHex(delegation4ActualHashBytes)).toEqual(blobToHex(blobFromUint8Array(expectedHashBytes)))
});
