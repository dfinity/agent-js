import { shallow, mount } from 'enzyme';
import * as React from 'react';
import { useReducer, init } from './reducer';
import { IdentityProviderState, JsonnableIdentityProviderState } from './state';
import { StateToStringCodec } from './state-serialization';

describe('@dfinity/identity-provider/design-phase-0/state-serialization', () => {
  it('works', () => {
    const sampleLoginHint: string =
      '302a300506032b65700321006f060234ec1dcf08e4fedf8d0a52f9842cc7a96b79ed37f323cb2798264203cb';
    const sampleState: IdentityProviderState = {
      type: 'IdentityProviderState',
      identities: {
        root: {
          publicKey: {
            hex: sampleLoginHint,
          },
        },
      },
    };
    const codec = StateToStringCodec();
    expect(codec.decode(codec.encode(sampleState))).toStrictEqual(sampleState);
  });
});
