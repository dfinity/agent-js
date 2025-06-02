/**
 * A DER encoded `SEQUENCE(OID)` for DER-encoded-COSE
 */
export const DER_COSE_OID = Uint8Array.from([
  ...[0x30, 0x0c], // SEQUENCE
  ...[0x06, 0x0a], // OID with 10 bytes
  ...[0x2b, 0x06, 0x01, 0x04, 0x01, 0x83, 0xb8, 0x43, 0x01, 0x01], // DER encoded COSE
]);

/**
 * A DER encoded `SEQUENCE(OID)` for the Ed25519 algorithm
 */
export const ED25519_OID = Uint8Array.from([
  ...[0x30, 0x05], // SEQUENCE
  ...[0x06, 0x03], // OID with 3 bytes
  ...[0x2b, 0x65, 0x70], // id-Ed25519 OID
]);

/**
 * A DER encoded `SEQUENCE(OID)` for secp256k1 with the ECDSA algorithm
 */
export const SECP256K1_OID = Uint8Array.from([
  ...[0x30, 0x10], // SEQUENCE
  ...[0x06, 0x07], // OID with 7 bytes
  ...[0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01], // OID ECDSA
  ...[0x06, 0x05], // OID with 5 bytes
  ...[0x2b, 0x81, 0x04, 0x00, 0x0a], // OID secp256k1
]);
