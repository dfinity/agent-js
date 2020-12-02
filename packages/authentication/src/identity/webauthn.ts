import { SignIdentity, PublicKey, BinaryBlob } from '@dfinity/agent';
import * as tweetnacl from 'tweetnacl';

/**
 * Create a challenge from a string or array. The default challenge is always the same
 * because we don't need to verify the authenticity of the key on the server (we don't
 * register our keys with the IC). Any challenge would do, even one per key, randomly
 * generated.
 * @param challenge The challenge to transform into a byte array. By default a hard
 *        coded string.
 */
function _createChallengeBuffer(challenge: string | Uint8Array = '<ic0.app>'): Uint8Array {
  if (typeof challenge === 'string') {
    return Uint8Array.from(challenge, c => c.charCodeAt(0));
  } else {
    return challenge;
  }
}

/**
 * Create a credentials to authenticate with a server. This is necessary in order in
 * WebAuthn to get credentials IDs (which give us the public key and allow us to
 * sign), but in the case of the Internet Computer, we don't actually need to register
 * it, so we don't. This is exported from this file, but not the package index, so
 * that we can test for it.
 * @internal
 */
export async function createChallenge(): Promise<Credential | null> {
  const creds = await navigator.credentials.get({
    publicKey: {
      challenge: _createChallengeBuffer(options.challenge),
      pubKeyCredParams: [{ type: 'public-key', alg: PubKeyCoseAlgo.ECDSA_WITH_SHA256 }],
      user: {
        id: tweetnacl.randomBytes(16),
        name: options.user || 'ic0 user',
        displayName: options.user || 'ic0 user',
      },
    },
  });

}

// See https://www.iana.org/assignments/cose/cose.xhtml#algorithms for a complete
// list of these algorithms. We only list the ones we support here.
enum PubKeyCoseAlgo {
  ECDSA_WITH_SHA256 = -7,
}

export interface WebauthnCredentials {
  publicKey?: any;
  creds: Credential;
}

export interface WebauthnIdentityCreateOptions {
  domain: string;
  user?: string;
  challenge?: string | Uint8Array;
}

export class WebauthnIdentity extends SignIdentity {
  public static async create(options: WebauthnIdentityCreateOptions): Promise<WebauthnIdentity> {

    if (!creds) {
      throw new Error('Could not create credentials.');
    }
    return new this({ creds });
  }

  protected constructor(private _credentials: WebauthnCredentials) {
    super();
  }

  public getPublicKey(): PublicKey {
    this._credentials.creds.
  }

  public sign(blob: BinaryBlob): Promise<import('@dfinity/agent').BinaryBlob> {
    throw new Error('Method not implemented.');
  }
}
