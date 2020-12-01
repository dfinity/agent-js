import { SignIdentity, PublicKey, BinaryBlob } from '@dfinity/agent';

export interface WebauthnCredentials {
  publicKey: any;
}


export interface WebauthnIdentityCreateOptions {
  domain: string; challenge?: string | Uint8Array;
}

export class WebauthnIdentity extends SignIdentity {
  public static async create(options: WebauthnIdentityCreateOptions): Promise<WebauthnIdentity> {
    const challenge = typeof options.challenge === 'string' ?
    const creds = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'DFINITY Internet Computer',
          id: options.domain,
        },
      },
    });
  }

  protected constructor(private _credentials: WebauthnCredentials) {
    super();
  }

  public getPublicKey(): PublicKey {
    throw new Error('Method not implemented.');
  }

  public sign(blob: BinaryBlob): Promise<import('@dfinity/agent').BinaryBlob> {
    throw new Error('Method not implemented.');
  }
}
