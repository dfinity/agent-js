import { DelegationChain, Ed25519KeyIdentity, Ed25519PublicKey } from '@dfinity/authentication';
import {
  bip39GenerateMnemonic,
  bip39MnemonicToEntropy,
} from '@dfinity/authentication/src/identity/bip39';
import { getItem, setItem } from 'localforage';
import { useState } from 'react';
import { UseAuthContext } from './use-auth';
import { getRequiredQueryParams } from '../identity-provider';
import {
  LOCAL_STORAGE_ROOT_CREDENTIAL,
  LOCAL_STORAGE_ROOT_DELEGATION_CHAIN,
} from '../utils/constants';

export function useDeviceDelegation(auth: UseAuthContext | null) {
  const [rootDelegationChain, setRootDelegationChain] = useState<DelegationChain>();
  const [deviceDelegationChain, setDeviceDelegationChain] = useState<DelegationChain>();
  if (!auth) {
    return {
      rootDelegationChain,
      deviceDelegationChain,
    };
  } else {
    getItem<DelegationChain>(LOCAL_STORAGE_ROOT_DELEGATION_CHAIN).then(lsDelegationChain => {
      if (lsDelegationChain) {
        setRootDelegationChain(lsDelegationChain);
      }
    });

    let deviceIdentity;

    if (!rootDelegationChain) {
      console.log('has no root delegation chain');
      // prompt user to authorize IDP to create root delegation
      const mnemonic = bip39GenerateMnemonic();
      const rootSeed = bip39MnemonicToEntropy(mnemonic);
      const rootIdentity = Ed25519KeyIdentity.generate(rootSeed);
      const rootKey = rootIdentity.getKeyPair();
      console.log('setting local storage root credential: ', rootKey);
      setItem(LOCAL_STORAGE_ROOT_CREDENTIAL, rootKey).then(() => {
        deviceIdentity = Ed25519KeyIdentity.generate();
        console.log({ deviceIdentity });

        const from = rootIdentity;
        const to = deviceIdentity.getKeyPair().publicKey;
        DelegationChain.create(from, to, new Date(2099))
          .then(v => {
            setRootDelegationChain(v);
            setItem(LOCAL_STORAGE_ROOT_DELEGATION_CHAIN, JSON.stringify(v.toJSON()));
          })
          .catch(err => {
            console.error(err);
          });
      });
    } else {
      // has root delegation, so we just need device delegation
      console.log('we have root, create device');
      const from = deviceIdentity || Ed25519KeyIdentity.generate();
      let to;
      try {
        const { loginHint } = getRequiredQueryParams(window.location.search);
        // @ts-ignore
        to = Ed25519PublicKey.fromDer(loginHint);
      } catch (error) {
        to = Ed25519KeyIdentity.generate().getPublicKey();
      }

      DelegationChain.create(from, to, undefined, {
        previous: rootDelegationChain,
      }).then(deviceDelegation => setDeviceDelegationChain(deviceDelegation));
    }
  }

  return {
    rootDelegationChain,
    deviceDelegationChain,
  };
}
