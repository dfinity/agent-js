import { BinaryBlob, blobFromUint8Array } from '@dfinity/agent';
import { Ed25519KeyIdentity, Ed25519PublicKey } from '@dfinity/authentication';
import { LOCAL_STORAGE_ROOT_CREDENTIAL } from '../utils/constants';

export interface StoredKeyPair {
  publicKey: BinaryBlob;
  secretKey: BinaryBlob;
}

export class AuthStore {
  constructor(private storage: LocalForage) {}

  /**
   * save root identity to storage (LocalForage probably)
   * NB: it needs to serialize the public key because we can't store classes in LF.
   */
  public async saveRootIdentity(rootIdentity: Ed25519KeyIdentity): Promise<void> {
    const rootKeyPair = rootIdentity.getKeyPair();
    const keyPairJSON: StoredKeyPair = {
      publicKey: rootKeyPair.publicKey.toDer(),
      secretKey: rootKeyPair.secretKey,
    };

    try {
      await this.storage.setItem<StoredKeyPair>(LOCAL_STORAGE_ROOT_CREDENTIAL, keyPairJSON);
      return void 0;
    } catch (error) {
      Promise.reject(Error('failed to store root key pair'));
    }
  }

  /**
   * Attempt to retrieve root identity keypair from storage
   * Reconstruct Ed25519PublicKey from storage's public key
   */
  public async getRootIdentity(): Promise<Ed25519KeyIdentity | undefined> {
    const storedKeyPair = await this.storage.getItem<StoredKeyPair>(LOCAL_STORAGE_ROOT_CREDENTIAL);

    if (storedKeyPair) {
      // storage can't handle buffers, just UIntArrays, so we must transform!
      const rawKeyBlob = blobFromUint8Array(storedKeyPair.publicKey);
      const pubKeyRaw = Ed25519PublicKey.fromDer(rawKeyBlob).toRaw();
      const identity = Ed25519KeyIdentity.fromKeyPair(pubKeyRaw, storedKeyPair.secretKey);
      return identity;
    } else {
      return Promise.resolve(undefined);
    }
  }
}
