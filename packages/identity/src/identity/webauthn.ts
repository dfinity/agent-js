import {
  BinaryBlob,
  blobFromHex,
  blobFromUint8Array,
  derBlobFromBlob,
  DerEncodedBlob,
  PublicKey,
  SignIdentity,
} from '@dfinity/agent';
import borc from 'borc';
import * as tweetnacl from 'tweetnacl';

function _coseToDerEncodedBlob(cose: ArrayBuffer): DerEncodedBlob {
  const c = new Uint8Array(cose);

  if (c.byteLength > 230) {
    // 'Tis true, 'tis too much.
    throw new Error('Cannot encode byte length of more than 230.');
  }

  // prettier-ignore
  const der = new Uint8Array([
    0x30, 0x10 + c.byteLength + 1,  // Sequence of length 16 + c.length.
    0x30, 0x0C,  // Sequence of length 12
    // OID 1.3.6.1.4.1.56387.1.1
    0x06, 0x0A, 0x2B, 0x06, 0x01, 0x04, 0x01, 0x83, 0xB8, 0x43, 0x01, 0x01,
    0x03, 1 + c.byteLength, 0x00,  // BIT String of length c.length.
    ...c,
  ]);

  return derBlobFromBlob(blobFromUint8Array(der));
}

/**
 * From the documentation;
 * The authData is a byte array described in the spec. Parsing it will involve slicing bytes from
 * the array and converting them into usable objects.
 *
 * See https://webauthn.guide/#registration (subsection "Example: Parsing the authenticator data").
 *
 * @param authData The authData field of the attestation response.
 * @returns The COSE key of the authData.
 */
function _authDataToCose(authData: ArrayBuffer): ArrayBuffer {
  const dataView = new DataView(new ArrayBuffer(2));
  const idLenBytes = authData.slice(53, 55);
  [...new Uint8Array(idLenBytes)].forEach((v, i) => dataView.setUint8(i, v));
  const credentialIdLength = dataView.getUint16(0);

  // Get the public key object.
  return authData.slice(55 + credentialIdLength);
}

export class CosePublicKey implements PublicKey {
  protected _encodedKey: DerEncodedBlob;
  public constructor(protected _cose: BinaryBlob) {
    this._encodedKey = _coseToDerEncodedBlob(_cose);
  }

  public toDer(): DerEncodedBlob {
    return this._encodedKey;
  }

  public getCose(): BinaryBlob {
    return this._cose;
  }
}

/**
 * Create a challenge from a string or array. The default challenge is always the same
 * because we don't need to verify the authenticity of the key on the server (we don't
 * register our keys with the IC). Any challenge would do, even one per key, randomly
 * generated.
 *
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
 * it, so we don't.
 * @param credentialCreationOptions an optional CredentialCreationOptions object
 */
async function _createCredential(
  credentialCreationOptions?: CredentialCreationOptions,
): Promise<PublicKeyCredential | null> {
  const creds = (await navigator.credentials.create(
    credentialCreationOptions ?? {
      publicKey: {
        authenticatorSelection: {
          userVerification: 'preferred',
        },
        attestation: 'direct',
        challenge: _createChallengeBuffer(),
        pubKeyCredParams: [{ type: 'public-key', alg: PubKeyCoseAlgo.ECDSA_WITH_SHA256 }],
        rp: {
          name: 'Internet Identity Service',
        },
        user: {
          id: tweetnacl.randomBytes(16),
          name: 'Internet Identity',
          displayName: 'Internet Identity',
        },
      },
    },
  )) as PublicKeyCredential;

  // Validate that it's the correct type at runtime, since WebAuthn does not HAVE to
  // reply with a PublicKeyCredential.
  if (creds.response === undefined || !(creds.rawId instanceof ArrayBuffer)) {
    return null;
  } else {
    return creds;
  }
}

// See https://www.iana.org/assignments/cose/cose.xhtml#algorithms for a complete
// list of these algorithms. We only list the ones we support here.
enum PubKeyCoseAlgo {
  ECDSA_WITH_SHA256 = -7,
}

/**
 * A SignIdentity that uses `navigator.credentials`. See https://webauthn.guide/ for
 * more information about WebAuthentication.
 */
export class WebAuthnIdentity extends SignIdentity {
  /**
   * Create an identity from a JSON serialization.
   * @param json - json to parse
   */
  public static fromJSON(json: string): WebAuthnIdentity {
    const { publicKey, rawId } = JSON.parse(json);

    if (typeof publicKey !== 'string' || typeof rawId !== 'string') {
      throw new Error('Invalid JSON string.');
    }

    return new this(blobFromHex(rawId), blobFromHex(publicKey));
  }

  /**
   * Create an identity.
   * @param credentialCreationOptions an optional CredentialCreationOptions Challenge
   */
  public static async create(
    credentialCreationOptions?: CredentialCreationOptions,
  ): Promise<WebAuthnIdentity> {
    const creds = await _createCredential(credentialCreationOptions);

    if (!creds || creds.type !== 'public-key') {
      throw new Error('Could not create credentials.');
    }

    const response = creds.response as AuthenticatorAttestationResponse;
    if (!(response.attestationObject instanceof ArrayBuffer)) {
      throw new Error('Was expecting an attestation response.');
    }

    // Parse the attestationObject as CBOR.
    const attObject = borc.decodeFirst(new Uint8Array(response.attestationObject));

    return new this(
      blobFromUint8Array(new Uint8Array(creds.rawId)),
      blobFromUint8Array(new Uint8Array(_authDataToCose(attObject.authData))),
    );
  }

  protected _publicKey: CosePublicKey;

  protected constructor(public readonly rawId: BinaryBlob, cose: BinaryBlob) {
    super();
    this._publicKey = new CosePublicKey(cose);
  }

  public getPublicKey(): PublicKey {
    return this._publicKey;
  }

  public async sign(blob: BinaryBlob): Promise<BinaryBlob> {
    const result = (await navigator.credentials.get({
      publicKey: {
        allowCredentials: [
          {
            type: 'public-key',
            id: this.rawId,
          },
        ],
        challenge: blob,
        userVerification: 'preferred',
      },
    })) as PublicKeyCredential;

    const response = result.response as AuthenticatorAssertionResponse;
    if (
      response.signature instanceof ArrayBuffer &&
      response.authenticatorData instanceof ArrayBuffer
    ) {
      const cbor = borc.encode(
        new borc.Tagged(55799, {
          authenticator_data: new Uint8Array(response.authenticatorData),
          client_data_json: new TextDecoder().decode(response.clientDataJSON),
          signature: new Uint8Array(response.signature),
        }),
      );
      if (!cbor) {
        throw new Error('failed to encode cbor');
      }
      return blobFromUint8Array(new Uint8Array(cbor));
    } else {
      throw new Error('Invalid response from WebAuthn.');
    }
  }

  /**
   * Allow for JSON serialization of all information needed to reuse this identity.
   */
  public toJSON(): JsonnableWebAuthnIdentitiy {
    return {
      publicKey: this._publicKey.getCose().toString('hex'),
      rawId: this.rawId.toString('hex'),
    };
  }
}

/**
 * ReturnType<WebAuthnIdentity.toJSON>
 * * publicKey is hex(der(publicKey))
 * * rawId is the string representation of the local WebAuthn Credential.id (iirc it is base64url encoded)
 */
export interface JsonnableWebAuthnIdentitiy {
  publicKey: string;
  rawId: string;
}
