import * as icid from '@dfinity/authentication';
import * as t from 'io-ts';
import { DelegationChain, Ed25519KeyIdentity, WebAuthnIdentity } from '@dfinity/authentication';
import { withDefault } from '../state-serialization';
import { PublicKey, derBlobFromBlob, blobFromHex, blobFromUint8Array } from '@dfinity/agent';
import tweetnacl from 'tweetnacl';
import { hexToBytes } from '../../../bytes';
import { EffectRequested } from '../reducer-effects';
import { SignerCodec, Ed25519Signer, WebAuthnIdentitySigner } from '../codecs/sign';

const AuthenticationRequestCodec = t.type({
  type: t.literal('AuthenticationRequest'),
  redirectUri: t.string,
  sessionIdentity: t.type({
    hex: t.string,
  }),
  scope: t.string,
});

const ConsentProposalCodec = t.type({
  request: AuthenticationRequestCodec,
  signer: SignerCodec,
});

export type AuthenticationResponseConsentProposal = t.TypeOf<typeof ConsentProposalCodec>;

const DateCodec = t.type({
  iso8601: t.string,
});

export const AuthenticationRequestConsentCodec = t.type({
  type: t.literal('AuthenticationRequestConsent'),
  attributedTo: t.type({
    publicKey: t.type({
      hex: t.string,
    }),
  }),
  proposal: ConsentProposalCodec,
  createdAt: DateCodec,
});

export type AuthenticationRequestConsent = t.TypeOf<typeof AuthenticationRequestConsentCodec>;

export type Action =
  | { type: 'reset' }
  | {
      type: 'AuthenticationRequestReceived';
      payload: icid.AuthenticationRequest;
    } /* The IdentityProvider has prepared a final AuthenticationResponse. If the end-user consents to sending it back to the RP, then we should do that at end of authn */
  | {
      type: 'AuthenticationResponsePrepared';
      payload: icid.AuthenticationResponse;
    }
  | {
      type: 'AuthenticationRequestConsentReceived';
      payload: {
        consent: t.TypeOf<typeof AuthenticationRequestConsentCodec>;
      };
    };

const AuthenticationResponseCodec = t.intersection([
  t.type({
    type: t.literal('AuthenticationResponse'),
    accessToken: t.string,
    tokenType: t.literal('bearer'),
    expiresIn: t.number,
  }),
  t.partial({
    scope: t.string,
    state: t.union([t.undefined, t.string]),
  }),
]);

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

/**
 * Update state given an action.
 * @param state - previous state
 * @param action - new action
 * @returns new state
 */
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
    case 'AuthenticationRequestConsentReceived': {
      /* The end-user just consented to an AuthenticationRequest. Update state to reflect this consent. */
      const { consent } = action.payload;
      return {
        ...state,
        consent,
      };
    }
    case 'AuthenticationResponsePrepared':
      return {
        ...state,
        response: action.payload,
      };
  }
  return state;
}

/** construct initial state */
export function init(): State {
  return {
    request: undefined,
    consent: undefined,
    foo: 'init foo',
  };
}

/**
 * Given an action, return any effects.
 * Handles:
 * * AuthenticationRequestConsentReceived
 *   * build resulting AuthenticationResponse from consent, then dispatch AuthenticationResponsePrepared
 * @param action - Action that might warrant an effect
 */
export function effect(action: Action): undefined | EffectRequested<Action> {
  switch (action.type) {
    case 'AuthenticationRequestConsentReceived':
      return {
        type: 'EffectRequested',
        payload: {
          async effect() {
            const authenticationResponse = await respond({
              consent: action.payload.consent,
            });
            const responsePrepared: Action = {
              type: 'AuthenticationResponsePrepared',
              payload: authenticationResponse,
            };
            return [responsePrepared];
          },
        },
      };
  }
}

/**
 * Wraps a dispatch into a new dispatch with side effects.
 * Put everything here that should happen as a side effect to an action.
 * @param dispatch - function to dispatch more events
 */
export function effector(dispatch: React.Dispatch<Action>): React.Dispatch<Action> {
  return async (action: Action) => {
    switch (action.type) {
      case 'AuthenticationRequestConsentReceived': {
        console.log('authentication effector AuthenticationRequestConsentReceived');
        const authenticationResponse = await respond({
          consent: action.payload.consent,
        });
        const responsePrepared: Action = {
          type: 'AuthenticationResponsePrepared',
          payload: authenticationResponse,
        };
        dispatch(responsePrepared);
        break;
      }
    }
  };
}

async function respond(spec: {
  consent: AuthenticationRequestConsent;
}): Promise<icid.AuthenticationResponse> {
  const request = spec.consent.proposal.request;
  const parsedScope = icid.scope.parseScopeString(request.scope);
  const delegationTail: PublicKey = {
    toDer() {
      return derBlobFromBlob(blobFromHex(request.sessionIdentity.hex));
    },
  };
  const signer = spec.consent.proposal.signer;
  const signIdentity = createSignIdentity(signer);
  const _24hrsInMs = 1000 * 60 * 60 * 24;
  const response: icid.AuthenticationResponse = {
    type: 'AuthenticationResponse',
    accessToken: icid.request.createBearerToken({
      delegationChain: await DelegationChain.create(
        signIdentity,
        delegationTail,
        new Date(Date.now() + _24hrsInMs) /* 24hr expiry */,
        {
          targets: parsedScope.map(({ principal }) => principal),
        },
      ),
    }),
    expiresIn: 10000000,
    tokenType: 'bearer',
    scope: icid.scope.stringifyScope(parsedScope),
  };
  return response;
}

/**
 * Given a declarative 'Signer' object, return the appropriate SignIdentity instance from @dfinity/authentication.
 * @param signer - description of SignIdentity
 */
export function createSignIdentity(
  signer: WebAuthnIdentitySigner | Ed25519Signer,
): WebAuthnIdentity | Ed25519KeyIdentity {
  switch (signer.type) {
    case 'Ed25519Signer': {
      const keyPair = tweetnacl.sign.keyPair.fromSecretKey(
        Uint8Array.from(hexToBytes(signer.credential.secretKey.hex)),
      );
      return Ed25519KeyIdentity.fromKeyPair(
        blobFromUint8Array(keyPair.publicKey),
        blobFromUint8Array(keyPair.secretKey),
      );
    }
    case 'WebAuthnIdentitySigner':
      return (() => {
        console.log('about to WebAuthnIdentity.fromJSON', signer);
        const webAuthnIdentity = WebAuthnIdentity.fromJSON(signer.json);
        return webAuthnIdentity;
      })();
    default:
  }
  throw new Error('Unexpected consent.signer.type');
}
