import {
  IdentityProviderState,
  IdentityProviderStateType,
} from './state';
import { StateToStringCodec } from './state-serialization';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';

describe('@dfinity/identity-provider/design-phase-0/state-serialization', () => {
  it('works', () => {
    const sampleLoginHint =
      '302a300506032b65700321006f060234ec1dcf08e4fedf8d0a52f9842cc7a96b79ed37f323cb2798264203cb';
    const sampleState: IdentityProviderState = {
      authentication: {
        consent: undefined,
        request: undefined,
        foo: 'bar',
      },
      identities: {
        root: {
          publicKey: {
            hex: sampleLoginHint,
          },
          sign: undefined,
        },
      },
      delegation: {
        target: undefined,
      },
      webAuthn: {
        webAuthnWorks: true,
      },
    };
    const codec = StateToStringCodec(IdentityProviderStateType);
    const encoded = codec.encode(sampleState);
    expect(
      pipe(
        codec.decode(encoded),
        fold(
          errors => {
            throw errors;
          },
          s => s,
        ),
      ),
    ).toStrictEqual(sampleState);
  });
});
