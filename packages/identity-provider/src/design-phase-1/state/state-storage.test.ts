import { shallow, mount } from 'enzyme';
import * as React from 'react';
import { useReducer } from './reducer';
import { StateToStringCodec, Codec } from './state-serialization';
import { IdentityProviderState } from './state';
import { IStorage } from 'src/relying-party-demo/storage';
import { SerializedStorage } from './state-storage';

describe('@dfinity/identity-provider/design-phase-0/state-storage', () => {
  it('works', () => {
    let str: string = 'init';
    const storage = SerializedStorage(
      {
        get() {
          return str;
        },
        set(input: string) {
          str = input;
        },
      },
      StateToStringCodec(),
    );
    const state0: IdentityProviderState = {
      type: 'IdentityProviderState',
      identities: {
        root: {
          publicKey: undefined,
        },
      },
    };
    storage.set(state0);
    expect(str).toContain(state0.type);
    expect(storage.get()).toEqual(state0);
  });
});
