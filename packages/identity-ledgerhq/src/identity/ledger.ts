import {
  blobFromUint8Array,
  CallRequest,
  Cbor,
  HttpAgentRequest,
  Identity,
  Principal,
  ReadRequest,
} from '@dfinity/agent';
import Transport from '@ledgerhq/hw-transport';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import DfinityApp, { ResponseSign } from '@zondax/ledger-dfinity';
import { Secp256k1PublicKey } from './secp256k1';

export class LedgerIdentity implements Identity {
  public constructor(
    private readonly _app: DfinityApp,
    private readonly _derivePath: string,
    private readonly _principal: Principal,
    private readonly _publicKey: Secp256k1PublicKey,
    private readonly _address: any,
    private readonly _ledgerCanisterId: Principal,
    private readonly _governanceCanisterId: Principal,
  ) {}

  /*
  * Required by Ledger.com that the user should be able to press a Button in UI
  * and verify the address/pubkey are the same as on the device screen
  */
  public async showAddressAndPubKeyOnDevice(): Promise<void> {
    await this._app.showAddressAndPubKey(this._derivePath);
  }

  public getPrincipal(): Principal {
    return this._principal;
  }

  public async transformRequest(request: HttpAgentRequest): Promise<unknown> {
    const { body, ...fields } = request;
    const cborBody = _prepareCborForLedger(body);

    const resp: ResponseSign = await this._app.sign(this._derivePath, cborBody);
    const signatureRS = resp.signatureRS;
    if (!signatureRS) {
      throw new Error(`A ledger error happened during signature:\n`
        + `Code: ${resp.returnCode}\n`
        + `Message: ${JSON.stringify(resp.errorMessage)}\n`);
    }

    if (signatureRS?.byteLength !== 64) {
      throw new Error(`Signature must be 64 bytes long (is ${signatureRS.length})`);
    }
    return {
      ...fields,
      body: {
        content: body,
        sender_pubkey: this._publicKey.toDer(),
        sender_sig: signatureRS,
      },
    };
  }
}

/**
 * Convert the HttpAgentRequest body into cbor
 * which can be signed by the Ledger Hardware Wallet
 * @param request - body of the HttpAgentRequest
 */
function _prepareCborForLedger(request: ReadRequest | CallRequest): Buffer {
  return Buffer.from(Cbor.encode({ content: request }));
}

export class LedgerManager {
  public static async fromWebUsb(): Promise<LedgerManager> {
    const transport = await TransportWebUSB.create();
    return new this(transport);
  }

  private readonly _app: DfinityApp;
  private _legderCanisterId?: Principal;
  private governanceCanisterId?: Principal;

  private constructor(transport: Transport) {
    this._app = new DfinityApp(transport);
  }

  public async getLedgerIdentity(derivePath = `m/44'/223'/0'/0/0`): Promise<LedgerIdentity> {
    const resp = await this._app.getAddressAndPubKey(derivePath);
    const principal = Principal.fromText((resp as any).principalText);
    const publicKey = Secp256k1PublicKey.fromRaw(blobFromUint8Array(resp.publicKey));
    const address = resp.address;
    if (this._legderCanisterId === undefined || this.governanceCanisterId === undefined) {
      throw new Error('Canister ID of ledger and governance must be set according to the network');
    }
    return new LedgerIdentity(this._app, derivePath,
      principal, publicKey, address,
      this._legderCanisterId, this.governanceCanisterId);
  }
}
