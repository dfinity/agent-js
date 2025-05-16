// https://github.com/dfinity-lab/dfinity/blob/5fef1450c9ab16ccf18381379149e504b11c8218/docs/spec/public/index.adoc#request-ids
import { Principal } from '@dfinity/principal';
import { hashValue, requestIdOf } from './request_id';
import borc from 'borc';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

// This is based on the example in the spec.
test('requestIdOf', async () => {
  const request = {
    request_type: 'call',
    method_name: 'hello',

    // 0x00000000000004D2
    // \x00\x00\x00\x00\x00\x00\x04\xD2
    // 0   0   0   0   0   0   4   210
    canister_id: new Uint8Array([0, 0, 0, 0, 0, 0, 4, 210]),

    // DIDL\x00\xFD*
    // D   I   D   L   \x00  \253  *
    // 68  73  68  76  0     253   42
    arg: new Uint8Array([68, 73, 68, 76, 0, 253, 42]),
  };

  const requestId = requestIdOf(request);

  expect(bytesToHex(requestId)).toEqual(
    '8781291c347db32a9d8c10eb62b710fce5a93be676474c42babc74c51858f94b',
  );
});

test('requestIdOf for sender_delegation signature', async () => {
  // this is what replica wants
  const expectedHashBytes = 'f0c66015041eccb5528fc7fd817bb4d0707369d7e1383d3cdaa074b2b2236824';
  const delegation1 = {
    expiration: BigInt('1611365875951000000'),
    pubkey: hexToBytes(
      '302a300506032b6570032100819d9fe3ac251039f934cdc925da0b019848af9d650d4136fb5d955cff17f78e',
    ),
    targets: [
      new Uint8Array([0, 0, 0, 0, 0, 48, 0, 77, 1, 1]),
      new Uint8Array([0, 0, 0, 0, 0, 32, 0, 43, 1, 1]),
    ],
  };
  const delegation1ActualHashBytes = requestIdOf(delegation1);
  expect(bytesToHex(delegation1ActualHashBytes)).toEqual(expectedHashBytes);

  // Note: this uses `bigint` and blobs, which the rest of this lib uses too.
  // Make sure this works before `delegation1` above (with BigInt)
  const delegation2 = {
    ...delegation1,
    pubkey: delegation1.pubkey,
    targets: delegation1.targets,
    expiration: BigInt(delegation1.expiration.toString()),
  };
  const delegation2ActualHashBytes = requestIdOf(delegation2);
  expect(bytesToHex(delegation2ActualHashBytes)).toEqual(bytesToHex(delegation1ActualHashBytes));

  // This one uses Principals as targets
  const delegation3 = {
    ...delegation1,
    targets: delegation1.targets.map(t => Principal.fromUint8Array(t)),
  };
  const delegation3ActualHashBytes = requestIdOf(delegation3);
  expect(bytesToHex(delegation3ActualHashBytes)).toEqual(bytesToHex(delegation1ActualHashBytes));
});

describe('hashValue', () => {
  it('should hash a string', () => {
    const value = hashValue('test');
    expect(value instanceof Uint8Array).toBe(true);
  });
  it('should hash a borc tagged value', () => {
    const tagged = hashValue(new borc.Tagged(42, 'hello'));
    expect(tagged instanceof Uint8Array).toBe(true);
  });
  it('should hash a number', () => {
    const value = hashValue(7);
    expect(value instanceof Uint8Array).toBe(true);
  });
  it('should hash an array', () => {
    const value = hashValue([7]);
    expect(value instanceof Uint8Array).toBe(true);
  });
  it('should hash a bigint', () => {
    const value = hashValue(BigInt(7));
    expect(value instanceof Uint8Array).toBe(true);
  });
  it('should hash objects using HashOfMap on their contents', () => {
    const value = hashValue({ foo: 'bar' });
    expect(value instanceof Uint8Array).toBe(true);
  });
  it('should throw otherwise', () => {
    const shouldThrow = () => {
      hashValue(() => undefined);
    };
    expect(shouldThrow).toThrow('Attempt to hash');
  });
});
