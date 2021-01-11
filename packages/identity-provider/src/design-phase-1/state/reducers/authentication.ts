import * as icid from '../../../protocol/ic-id-protocol';
import * as t from 'io-ts';
import { DelegationChain } from '@dfinity/authentication';
import { withDefault } from '../state-serialization';

export type Action =
  | { type: 'reset' }
  | { type: 'AuthenticationRequestReceived'; payload: icid.AuthenticationRequest }
  | {
      type: 'AuthenticationRequestConsentReceived';
      payload: {
        consent: {
          type: 'AuthenticationRequestConsent';
          // the end-user consented to a proposal
          proposal: {
            request: icid.AuthenticationRequest;
            /** Author of consent */
            attributedTo: { publicKey: { hex: string } };
          };
          createdAt: { iso8601: string };
        };
      };
    };

const AuthenticationRequestCodec = t.type({
  type: t.literal('AuthenticationRequest'),
  redirectUri: t.string,
  sessionIdentity: t.type({
    hex: t.string,
  }),
  scope: t.string,
});

const AuthenticationResponseCodec = t.union([
  t.type({
    type: t.literal('AuthenticationResponse'),
    accessToken: t.string,
    tokenType: t.literal('bearer'),
    state: t.union([t.undefined, t.string]),
  }),
  t.partial({
    scope: t.string,
  }),
]);

const ConsentProposalCodec = t.type({
  request: AuthenticationRequestCodec,
});

const DateCodec = t.type({
  iso8601: t.string,
});

const AuthenticationRequestConsentCodec = t.type({
  type: t.literal('AuthenticationRequestConsent'),
  proposal: ConsentProposalCodec,
  createdAt: DateCodec,
});

export const StateCodec = t.intersection([
  t.type({
    request: t.union([t.undefined, AuthenticationRequestCodec]),
    consent: t.union([t.undefined, AuthenticationRequestConsentCodec]),
    foo: withDefault(t.string, 'omg foo from default 2'),
  }),
  t.partial({
    response: AuthenticationResponseCodec,
  }),
]);
export type State = t.TypeOf<typeof StateCodec>;

export function reduce(state: State = init(), action: Action): State {
  switch (action.type) {
    case 'reset':
      return init();
    case 'AuthenticationRequestReceived':
      return {
        ...state,
        request: action.payload,
        response: undefined,
      };
    case 'AuthenticationRequestConsentReceived':
      /* The end-user just consented to an AuthenticationRequest. Update state to reflect this consent. */
      const proposal: t.TypeOf<typeof ConsentProposalCodec> = action.payload.consent.proposal;
      const consent: t.TypeOf<typeof AuthenticationRequestConsentCodec> = {
        type: 'AuthenticationRequestConsent',
        proposal,
        createdAt: { iso8601: new Date().toISOString() },
      };
      return {
        ...state,
        consent,
      };
  }
  return state;
}

export function init(): State {
  return {
    request: undefined,
    consent: undefined,
    foo: 'init foo',
  };
}

function AuthenticationRequestResponder(spec: { delegationChain: DelegationChain }) {
  return (request: icid.AuthenticationRequest): icid.AuthenticationResponse => {
    const accessToken = icid.createBearerToken({
      delegationChain: spec.delegationChain,
    });
    const expiresIn = (() => {
      const delegationChainExpirations = spec.delegationChain.delegations.map(({ delegation }) =>
        BigInt(delegation.expiration.toString()),
      );
      const minExpirationNanoseconds = delegationChainExpirations.reduce((prev, delegation) => {
        if (!prev) {
          return delegation;
        }
        // return min;
        return prev < delegation ? prev : delegation;
      });
      const nowNanoseconds = BigInt(Date.now()) * BigInt(1e9);
      const expiresInNanoseconds = minExpirationNanoseconds - nowNanoseconds;
      const expiresInSeconds = expiresInNanoseconds / BigInt(1e9);
      return Number(expiresInSeconds);
    })();
    const response: icid.AuthenticationResponse = {
      type: 'AuthenticationResponse',
      accessToken,
      tokenType: 'bearer',
      expiresIn,
    };
    return response;
  };
}
