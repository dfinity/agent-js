import { KeyPair } from '@dfinity/agent';
import { DelegationChain, Ed25519KeyIdentity, Ed25519PublicKey } from '@dfinity/authentication';
import {
  Bip39Ed25519KeyIdentity,
  bip39GenerateMnemonic,
  bip39MnemonicToEntropy,
} from '@dfinity/authentication/src/identity/bip39';
import { getItem, setItem } from 'localforage';
import { useAuth } from 'src/hooks/use-auth';
import { getRequiredQueryParams } from 'src/identity-provider';
import { LOCAL_STORAGE_ROOT_DELEGATION_CHAIN, LOCAL_STORAGE_WEBAUTHN_ID } from './constants';

export async function flow() {
  const auth = useAuth();
  if (auth) {
    let rootDelegationChain = await getItem<DelegationChain>(LOCAL_STORAGE_ROOT_DELEGATION_CHAIN);
    let deviceIdentity;

    if (!rootDelegationChain) {
      // prompt user to authorize IDP to create root delegation
      const mnemonic = bip39GenerateMnemonic();
      const rootSeed = bip39MnemonicToEntropy(mnemonic);
      const rootIdentity = Ed25519KeyIdentity.generate(rootSeed);
      const rootKey = rootIdentity.getKeyPair();

      deviceIdentity = Ed25519KeyIdentity.generate();

      const from = rootIdentity;
      const to = deviceIdentity.getKeyPair().publicKey;
      rootDelegationChain = await DelegationChain.create(from, to, new Date(Infinity));
      setItem(LOCAL_STORAGE_ROOT_DELEGATION_CHAIN, rootDelegationChain.toJSON());
    } else {
      // device delegation
      const from = deviceIdentity || Ed25519KeyIdentity.generate();
      const { loginHint } = getRequiredQueryParams(window.location.search);
      // @ts-ignore
      const to = Ed25519PublicKey.fromDer(loginHint);
      const deviceDelegation = await DelegationChain.create(from, to, undefined, {
        previous: rootDelegationChain,
      });

      // redirect?
    }
  }
}
