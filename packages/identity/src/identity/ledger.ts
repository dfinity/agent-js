import {
  BinaryBlob,
  blobFromUint8Array,
  Cbor,
  derBlobFromBlob,
  DerEncodedBlob,
  Endpoint,
  HttpAgentRequest,
  Identity,
  Principal,
  PublicKey
} from '@dfinity/agent';
import DfinityApp from '../ledger-dfinity/index';
import { ResponseSign } from '../ledger-dfinity/index';
import Transport from '@ledgerhq/hw-transport';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';

const SIGN_TYPE = {
  UNSUPPORTED: -0x01,  // invalid for DfinityApp.sign()
  TOKEN_TRANSFER: 0x00,
  STATE_TRANSACTION_READ: 0x01,
};

// This implementation is adjusted from the Ed25519PublicKey.
// The RAW_KEY_LENGTH and DER_PREFIX are modified accordingly
export class Secp256k1PublicKey implements PublicKey {
  public static from(key: PublicKey): Secp256k1PublicKey {
    return this.fromDer(key.toDer());
  }

  public static fromRaw(rawKey: BinaryBlob): Secp256k1PublicKey {
    return new Secp256k1PublicKey(rawKey);
  }

  public static fromDer(derKey: BinaryBlob): Secp256k1PublicKey {
    return new Secp256k1PublicKey(this.derDecode(derKey));
  }

  // The length of secp256k1 public keys is always 65 bytes.
  private static RAW_KEY_LENGTH = 65;

  // Adding this prefix to a raw public key is sufficient to DER-encode it.
  // Ledger application has a C implementation here:
  // https://github.com/Zondax/ledger-dfinity/blob/55ec3e352b3f7fa118b93ca707f8659a4d1ff709/app/src/crypto.c#L74-L97
  private static DER_PREFIX = Uint8Array.from([
    0x30, 0x56, // SEQUENCE
    0x30, 0x10, // SEQUENCE
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ECDSA
    0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x0a, // OID secp256k1
    0x03, 0x42, // BIT STRING
    0x00, // no padding
  ]);

  private static derEncode(publicKey: BinaryBlob): DerEncodedBlob {
    if (publicKey.byteLength !== Secp256k1PublicKey.RAW_KEY_LENGTH) {
      const bl = publicKey.byteLength;
      throw new TypeError(
        `secp256k1 public key must be ${Secp256k1PublicKey.RAW_KEY_LENGTH} bytes long (is ${bl})`,
      );
    }

    const derPublicKey = Uint8Array.from([
      ...Secp256k1PublicKey.DER_PREFIX,
      ...new Uint8Array(publicKey),
    ]);

    return derBlobFromBlob(blobFromUint8Array(derPublicKey));
  }

  private static derDecode(key: BinaryBlob): BinaryBlob {
    const expectedLength = Secp256k1PublicKey.DER_PREFIX.length + Secp256k1PublicKey.RAW_KEY_LENGTH;
    if (key.byteLength !== expectedLength) {
      const bl = key.byteLength;
      throw new TypeError(
        `secp256k1 DER-encoded public key must be ${expectedLength} bytes long (is ${bl})`,
      );
    }

    const rawKey = blobFromUint8Array(key.subarray(Secp256k1PublicKey.DER_PREFIX.length));
    if (!this.derEncode(rawKey).equals(key)) {
      throw new TypeError(
        'secp256k1 DER-encoded public key is invalid. A valid secp256k1 DER-encoded public key ' +
        `must have the following prefix: ${Secp256k1PublicKey.DER_PREFIX}`,
      );
    }

    return rawKey;
  }

  private readonly rawKey: BinaryBlob;
  private readonly derKey: DerEncodedBlob;

  // `fromRaw` and `fromDer` should be used for instantiation, not this constructor.
  private constructor(key: BinaryBlob) {
    this.rawKey = key;
    this.derKey = Secp256k1PublicKey.derEncode(key);
  }

  public toDer(): DerEncodedBlob {
    return this.derKey;
  }

  public toRaw(): BinaryBlob {
    return this.rawKey;
  }
}

export class LedgerIdentity implements Identity {

  private readonly _app: DfinityApp;
  private readonly _derive_path: string;
  private readonly _principal: Principal;
  private readonly _public_key: Secp256k1PublicKey;
  private readonly _address: String;
  private readonly _ledger_canister_id: Principal;
  private readonly _governance_canister_id: Principal;

  public constructor(app: DfinityApp, derive_path: string,
    principle: Principal, public_key: Secp256k1PublicKey, address: string,
    ledger_canister_id: Principal, governance_canister_id: Principal) {
    this._app = app;
    this._derive_path = derive_path;
    this._principal = principle;
    this._public_key = public_key;
    this._address = address;
    this._ledger_canister_id = ledger_canister_id;
    this._governance_canister_id = governance_canister_id;
  }

  /*
  * Required by Ledger.com that the user should beable to press a Button in UI
  * and verify the address/pubkey are the same as on the device screen
  */
  public async showAddressAndPubKeyOnDevice() {
    const resp = await this._app.showAddressAndPubKey(this._derive_path);
    if (Principal.fromText(resp.addressText) !== this._principal ||
      Secp256k1PublicKey.fromRaw(blobFromUint8Array(resp.publicKey)) !== this._public_key ||
      resp.address != this._address) {
      throw new Error('Address/PubKey on device mismatch with this Identity');
    }
  }

  public getPrincipal(): Principal {
    return this._principal;
  }

  public async transformRequest(request: HttpAgentRequest): Promise<unknown> {
    const { body, ...fields } = request;
    const txblob = Buffer.from(Cbor.encode(body));

    let sign_type: number = SIGN_TYPE.UNSUPPORTED;
    if (request.endpoint === Endpoint.Call) {
      if (body.canister_id === this._ledger_canister_id) {
        if (body.method_name === 'send') {
          sign_type = SIGN_TYPE.TOKEN_TRANSFER
        }
      }
    }
    if (request.endpoint === Endpoint.ReadState) {
      sign_type = SIGN_TYPE.STATE_TRANSACTION_READ;
    }

    if (sign_type !== SIGN_TYPE.UNSUPPORTED) {
      const resp: ResponseSign = await this._app.sign(this._derive_path, sign_type, txblob);
      const signatureRS = resp.signatureRS;
      return {
        ...fields,
        body: {
          content: body,
          sender_pubkey: this._public_key.toDer(),
          sender_sig: signatureRS,
        },
      };
    } else {
      throw new Error('Request type not supported on Ledger Hardware Wallet');
    }

  }
}

export class LedgerManager {
  public static async fromWebusb(): Promise<LedgerManager> {
    const transport = await TransportWebUSB.create();
    return new this(transport);
  }

  public setLedgerCanisterId(ledger_canister_id: Principal) {
    this._ledger_canister_id = ledger_canister_id;
  }

  public setGovernanceCanisterId(governance_canister_id: Principal) {
    this._governance_canister_id = governance_canister_id;
  }

  public async getLedgerIdentity(derive_path = "m/44'/223'/0'/0/0"): Promise<LedgerIdentity> {
    const resp = await this._app.getAddressAndPubKey(derive_path);
    const principal = Principal.fromText(resp.addressText);
    const public_key = Secp256k1PublicKey.fromRaw(blobFromUint8Array(resp.publicKey));
    const address = resp.address;
    if (this._ledger_canister_id === undefined || this._governance_canister_id === undefined) {
      throw new Error('Canister ID of ledger and governance must be set according to the network');
    }
    return new LedgerIdentity(this._app, derive_path,
      principal, public_key, address,
      this._ledger_canister_id!, this._governance_canister_id!);
  }

  private readonly _app: DfinityApp;
  private _ledger_canister_id?: Principal;      // ryjl3-tyaaa-aaaaa-aaaba-cai
  private _governance_canister_id?: Principal;  // rrkah-fqaaa-aaaaa-aaaaq-cai

  private constructor(transport: Transport) {
    this._app = new DfinityApp(transport);
  }
}
