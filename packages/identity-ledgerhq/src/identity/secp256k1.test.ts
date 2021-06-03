import { blobFromHex } from '@dfinity/candid';
import { Secp256k1PublicKey } from './secp256k1';

const testVectors: Array<[string, string]> = [
  [
    '0410d34980a51af89d3331ad5fa80fe30d8868ad87526460b3b3e15596ee58e812422987d8589ba61098264df5bb9c2d3ff6fe061746b4b31a44ec26636632b835',
    '3056301006072A8648CE3D020106052B8104000A0342000410d34980a51af89d3331ad5fa80fe30d8868ad87526460b3b3e15596ee58e812422987d8589ba61098264df5bb9c2d3ff6fe061746b4b31a44ec26636632b835',
  ],
];

test('DER encoding of secp256k1 keys', async () => {
  testVectors.forEach(([rawPublicKeyHex, derEncodedPublicKeyHex]) => {
    const publicKey = Secp256k1PublicKey.fromRaw(blobFromHex(rawPublicKeyHex));
    const expectedDerPublicKey = blobFromHex(derEncodedPublicKeyHex);
    expect(publicKey.toDer()).toEqual(expectedDerPublicKey);
  });
});

test('DER decoding of ED25519 keys', async () => {
  testVectors.forEach(([rawPublicKeyHex, derEncodedPublicKeyHex]) => {
    const derPublicKey = blobFromHex(derEncodedPublicKeyHex);
    const expectedPublicKey = blobFromHex(rawPublicKeyHex);
    expect(Secp256k1PublicKey.fromDer(derPublicKey).toRaw()).toEqual(expectedPublicKey);
  });
});

test('DER encoding of invalid keys', async () => {
  // Too short
  expect(() => {
    Secp256k1PublicKey.fromRaw(
      blobFromHex(
        '0410d34980a51af89d3331ad5fa80fe30d8868ad87526460b3b3e15596ee58e812422987d8589ba61098264df5bb9c2d3ff6fe061746b4b31a44ec26636632b8',
      ),
    ).toDer();
  }).toThrow();

  // Too long
  expect(() => {
    Secp256k1PublicKey.fromRaw(
      blobFromHex(
        '0410d34980a51af89d3331ad5fa80fe30d8868ad87526460b3b3e15596ee58e812422987d8589ba61098264df5bb9c2d3ff6fe061746b4b31a44ec26636632b83500',
      ),
    ).toDer();
  }).toThrow();
});

test('DER decoding of invalid keys', async () => {
  // Too short
  expect(() => {
    Secp256k1PublicKey.fromDer(
      blobFromHex(
        '3056301006072A8648CE3D020106052B8104000A034200' +
          '0410d34980a51af89d3331ad5fa80fe30d8868ad87526460b3b3e15596ee58e812422987d8589ba61098264df5bb9c2d3ff6fe061746b4b31a44ec26636632b8',
      ),
    );
  }).toThrow();

  // Too long
  expect(() => {
    Secp256k1PublicKey.fromDer(
      blobFromHex(
        '3056301006072A8648CE3D020106052B8104000A034200' +
          '0410d34980a51af89d3331ad5fa80fe30d8868ad87526460b3b3e15596ee58e812422987d8589ba61098264df5bb9c2d3ff6fe061746b4b31a44ec26636632b83500',
      ),
    );
  }).toThrow();

  // Invalid DER-encoding
  expect(() => {
    Secp256k1PublicKey.fromDer(
      blobFromHex(
        '2056301006072A8648CE3D020106052B8104000A0342000410d34980a51af89d3331ad5fa80fe30d8868ad87526460b3b3e15596ee58e812422987d8589ba61098264df5bb9c2d3ff6fe061746b4b31a44ec26636632b835',
      ),
    );
  }).toThrow();
});
