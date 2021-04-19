import {
  blobFromUint8Array,
  CallRequest,
  Cbor,
  Endpoint,
  HttpAgentRequest,
  Identity,
  Principal,
  ReadRequest,
  SubmitRequestType,
} from '@dfinity/agent';
import DfinityApp from '../ledger-dfinity/index';
import { ResponseSign } from '../ledger-dfinity/index';
import Transport from '@ledgerhq/hw-transport';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { Secp256k1PublicKey } from './secp256k1';

const SIGN_TYPE = {
  UNSUPPORTED: -0x01,  // invalid for DfinityApp.sign()
  TOKEN_TRANSFER: 0x00,
  STATE_TRANSACTION_READ: 0x01,
};

export class LedgerIdentity implements Identity {
  private readonly _app: DfinityApp;
  private readonly _derive_path: string;
  private readonly _principal: Principal;
  private readonly _public_key: Secp256k1PublicKey;
  private readonly _address: string;
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
  * Required by Ledger.com that the user should be able to press a Button in UI
  * and verify the address/pubkey are the same as on the device screen
  */
  public async showAddressAndPubKeyOnDevice(): Promise<void> {
    // Should do the following check when app.showAddressAndPubKey and app.getAddressAndPubKey
    // has the same return content
    // const resp = await this._app.showAddressAndPubKey(this._derive_path);
    // if (Principal.fromText(resp.addressText) !== this._principal ||
    //   Secp256k1PublicKey.fromRaw(blobFromUint8Array(Buffer.from(resp.publicKey, 'hex'))) !== this._public_key ||
    //   resp.address != this._address) {
    //   throw new Error('Address/PubKey on device mismatch with this Identity');
    // }
    await this._app.showAddressAndPubKey(this._derive_path);
  }

  public getPrincipal(): Principal {
    return this._principal;
  }

  public async transformRequest(request: HttpAgentRequest): Promise<unknown> {
    const { body, ...fields } = request;
    const txblob = prepareCborForLedger(body);

    let sign_type: number = SIGN_TYPE.UNSUPPORTED;
    if (body.request_type === SubmitRequestType.Call) {
      // Canister cannot check equality directly
      if (body.canister_id.toText() === this._ledger_canister_id.toText()) {
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
      if (signatureRS.byteLength != 64) {
        throw new Error(`Signature must be 64 bytes long (is ${signatureRS.length})`);
      }
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

/** 
 * Convert the HttpAgentRequest body into cbor
 * which can be signed by the Ledger Hardware Wallet
 * @param request - body of the HttpAgentRequest
 */
export function prepareCborForLedger(request: ReadRequest | CallRequest): Buffer {
  if (request.nonce === undefined) {
    throw new TypeError('The request body must contains nonce');
  }
  return Buffer.from(Cbor.encode({
    content: request
  }));
}

export class LedgerManager {
  public static async fromWebusb(): Promise<LedgerManager> {
    const transport = await TransportWebUSB.create();
    return new this(transport);
  }

  public setLedgerCanisterId(ledger_canister_id: Principal): void {
    this._ledger_canister_id = ledger_canister_id;
  }

  public setGovernanceCanisterId(governance_canister_id: Principal): void {
    this._governance_canister_id = governance_canister_id;
  }

  public async getLedgerIdentity(derive_path = "m/44'/223'/0'/0/0"): Promise<LedgerIdentity> {
    const resp = await this._app.getAddressAndPubKey(derive_path);
    const principal = Principal.fromText(resp.addressText);
    const public_key = Secp256k1PublicKey.fromRaw(blobFromUint8Array(Buffer.from(resp.publicKey, 'hex')));
    const address = resp.address;
    if (this._ledger_canister_id === undefined || this._governance_canister_id === undefined) {
      throw new Error('Canister ID of ledger and governance must be set according to the network');
    }
    return new LedgerIdentity(this._app, derive_path,
      principal, public_key, address,
      this._ledger_canister_id, this._governance_canister_id);
  }

  private readonly _app: DfinityApp;
  private _ledger_canister_id?: Principal;      // ryjl3-tyaaa-aaaaa-aaaba-cai
  private _governance_canister_id?: Principal;  // rrkah-fqaaa-aaaaa-aaaaq-cai

  private constructor(transport: Transport) {
    this._app = new DfinityApp(transport);
  }
}
