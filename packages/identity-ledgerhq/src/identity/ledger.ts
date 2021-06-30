import {
  CallRequest,
  Cbor,
  HttpAgentRequest,
  PublicKey,
  ReadRequest,
  SignIdentity,
} from '@dfinity/agent';
import { blobFromUint8Array, BinaryBlob } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import DfinityApp, { ResponseSign } from '@zondax/ledger-dfinity';
import { Secp256k1PublicKey } from './secp256k1';
import TransportClass from "@ledgerhq/hw-transport-webhid";

/**
 * Convert the HttpAgentRequest body into cbor which can be signed by the Ledger Hardware Wallet.
 * @param request - body of the HttpAgentRequest
 */
function _prepareCborForLedger(request: ReadRequest | CallRequest): BinaryBlob {
  return Cbor.encode({ content: request });
}

/**
 * A Hardware Ledger Internet Computer Agent identity.
 */
export class LedgerIdentity extends SignIdentity {
  /**
   * Create a LedgerIdentity using the Web USB transport.
   * @param derivePath The derivation path.
   */
  public static async create(derivePath = `m/44'/223'/0'/0/0`): Promise<LedgerIdentity> {
    const [app, transport] = await this._connect();

    try {
      const publicKey = await this._fetchPublicKeyFromDevice(app, derivePath);
      return new this(derivePath, publicKey);
    } finally {
      // Always close the transport.
      transport.close();
    }
  }

  private constructor(
    public readonly derivePath: string,
    private readonly _publicKey: Secp256k1PublicKey,
  ) {
    super();
  }

  /**
   * Connect to a ledger hardware wallet.
   */
  private static async _connect(): Promise<[DfinityApp, TransportClass]> {
    if (!await TransportClass.isSupported()) {
      // Data on browser compatibility is taken from https://caniuse.com/webhid
      throw "Your browser doesn't support WebHID, which is necessary to communicate with your wallet.\n\nSupported browsers:\n* Chrome (Desktop) v89+\n* Edge v89+\n* Opera v76+";
    }

    const transport = await TransportClass.create();
    const app = new DfinityApp(transport);

    return [app, transport];
  }

  private static async _fetchPublicKeyFromDevice(app: DfinityApp, derivePath: string): Promise<Secp256k1PublicKey> {
    const resp = await app.getAddressAndPubKey(derivePath);

    if (resp.returnCode == 28161) {
      throw "Please open the Internet Computer app on your wallet and try again.";
    } else if (resp.returnCode == 27014) {
      throw "Ledger Wallet is locked. Unlock it and try again."
    } else if (resp.returnCode == 65535) {
      throw "Unable to fetch the public key. Please try again."
    }

    // This type doesn't have the right fields in it, so we have to manually type it.
    const principal = (resp as unknown as { principalText: string }).principalText;
    const publicKey = Secp256k1PublicKey.fromRaw(blobFromUint8Array(resp.publicKey));

    if (principal !== Principal.selfAuthenticating(publicKey.toDer()).toText()) {
      throw new Error('Principal returned by device does not match public key.');
    }

    return publicKey;
  }

  /**
   * Required by Ledger.com that the user should be able to press a Button in UI
   * and verify the address/pubkey are the same as on the device screen.
   */
  public async showAddressAndPubKeyOnDevice(): Promise<void> {
    this._executeWithApp(async (app: DfinityApp) => {
      await app.showAddressAndPubKey(this.derivePath);
    });
  }

  public getPublicKey(): PublicKey {
    return this._publicKey;
  }

  public async sign(blob: BinaryBlob): Promise<BinaryBlob> {
    return await this._executeWithApp(async (app: DfinityApp) => {
      const resp: ResponseSign = await app.sign(this.derivePath, Buffer.from(blob));
      const signatureRS = resp.signatureRS;
      if (!signatureRS) {
        throw new Error(
          `A ledger error happened during signature:\n` +
          `Code: ${resp.returnCode}\n` +
          `Message: ${JSON.stringify(resp.errorMessage)}\n`,
        );
      }

      if (signatureRS?.byteLength !== 64) {
        throw new Error(`Signature must be 64 bytes long (is ${signatureRS.length})`);
      }

      return blobFromUint8Array(new Uint8Array(signatureRS));
    });
  }

  public async transformRequest(request: HttpAgentRequest): Promise<unknown> {
    const { body, ...fields } = request;
    const signature = await this.sign(_prepareCborForLedger(body));
    return {
      ...fields,
      body: {
        content: body,
        sender_pubkey: this._publicKey.toDer(),
        sender_sig: signature,
      },
    };
  }

  private async _executeWithApp<T>(func: (app: DfinityApp) => Promise<T>): Promise<T> {
    const [app, transport] = await LedgerIdentity._connect();

    try {
      // Verify that the public key of the device matches the public key of this identity.
      const devicePublicKey = await LedgerIdentity._fetchPublicKeyFromDevice(app, this.derivePath);
      if (JSON.stringify(devicePublicKey) !== JSON.stringify(this._publicKey)) {
        throw new Error("Found unexpected public key. Are you sure you're using the right wallet?");
      }

      // Run the provided function.
      return await func(app);
    } finally {
      transport.close();
    }
  }
}
