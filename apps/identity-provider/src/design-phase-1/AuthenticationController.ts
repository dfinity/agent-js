import { IdentityProviderAction } from './state/action';
import { Ed25519KeyIdentity, WebAuthnIdentity, request, response } from '@dfinity/authentication';
import { hexEncodeUintArray } from 'src/bytes';
import { SignIdentity } from '@dfinity/agent';
import { AuthenticationResponseConsentProposal } from './state/reducers/authentication';
import { Signer } from './state/codecs/sign';

/**
 * 'Controllers' can be useful as an Abstraction for state mutations that all have to do with a common use case or business requirement.
 * A Controller method can be be thought of as taking a request and returning some Effects. Here we define 'EffectCreator' to refer to this pattern.
 * A controller with many methods is a map of names to EffectCreators, i.e. an EffectCreatorMap.
 * This separates concerns of creating effects and publishing them.
 * Assert that 'controller objects' extend EffectCreatorMap to be sure that all controller methods return effects (instead of having untyped side-effects of the invocation, e.g. a dispatch())
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EffectCreator<Effect> = (...args: any[]) => Promise<Effect[]>;
type EffectCreatorMap<EffectCreatorNames extends string, Effect extends { type: string }> = {
  [key in EffectCreatorNames]: EffectCreator<Effect>;
};

interface IAuthenticationController extends EffectCreatorMap<string, IdentityProviderAction> {
  /**
   * Respond to the AuthenticationRequest with an AuthenticationResponse.
   * Send the AuthenticationResponse to redirect_uri via Navigate effect
   */
  respond(spec: {
    request: Pick<request.AuthenticationRequest, 'redirectUri'>;
    response: response.AuthenticationResponse;
  }): Promise<IdentityProviderAction[]>;
  consentToAuthenticationResponseProposal(spec: {
    consentProposal: AuthenticationResponseConsentProposal;
    consenter: SignIdentity;
  }): Promise<IdentityProviderAction[]>;
  useIdentityAndConfirm(spec: {
    identity: Ed25519KeyIdentity | WebAuthnIdentity;
  }): Promise<IdentityProviderAction[]>;
}

/**
 * Common methods used throughout the Authentication flow to coordinate state.
 * @param options options
 * @param options.urls - URLs of certain screens that the controller needs to navigate between.
 * @param options.urls.identity - identity-related URLs
 * @param options.urls.identity.confirmation - IdentityConfirmationScreen URL
 */
export default function AuthenticationController(options: {
  urls: {
    identity: {
      confirmation: string;
    };
  };
}): IAuthenticationController {
  const { urls } = options;
  const idpController: IAuthenticationController = {
    async respond(spec: {
      request: Pick<request.AuthenticationRequest, 'redirectUri'>;
      response: response.AuthenticationResponse;
    }): Promise<IdentityProviderAction[]> {
      const navigateToRedirectUriWithResponse: IdentityProviderAction = {
        type: 'Navigate',
        payload: {
          href: response.createSendResponseUri(
            new URL(spec.request.redirectUri),
            spec.response,
          ),
        },
      };
      return [navigateToRedirectUriWithResponse];
    },
    consentToAuthenticationResponseProposal: async function consent(spec: {
      consentProposal: AuthenticationResponseConsentProposal;
      consenter: SignIdentity;
    }) {
      const { consentProposal } = spec;
      console.debug('consentToAuthenticationResponseProposal', { consentProposal });
      const consentReceivedAction: IdentityProviderAction = {
        type: 'AuthenticationRequestConsentReceived',
        payload: {
          consent: {
            type: 'AuthenticationRequestConsent',
            proposal: spec.consentProposal,
            createdAt: { iso8601: new Date().toISOString() },
            attributedTo: {
              publicKey: {
                hex: hexEncodeUintArray(spec.consenter.getPublicKey().toDer()),
              },
            },
          },
        },
      };
      return [consentReceivedAction];
    },
    async useIdentityAndConfirm(spec) {
      const signer = describeSignIdentity(spec.identity);
      const delegationRootSignerChangedWebAuthn: IdentityProviderAction = {
        type: 'DelegationRootSignerChanged',
        payload: {
          signer,
        },
      };
      const navigateToConfirm: IdentityProviderAction = {
        type: 'Navigate',
        payload: {
          href: urls.identity.confirmation,
        },
      };
      return [delegationRootSignerChangedWebAuthn, navigateToConfirm];
    },
  };
  return idpController;
}

/**
 * Given an Identity, return a json-serializable description of the Identity.
 * @param identity - identity to describe
 */
export function describeSignIdentity(identity: WebAuthnIdentity | Ed25519KeyIdentity): Signer {
  if (identity instanceof WebAuthnIdentity) {
    return {
      type: 'WebAuthnIdentitySigner',
      json: JSON.stringify(identity.toJSON()),
    };
  }
  if (identity instanceof Ed25519KeyIdentity) {
    return {
      type: 'Ed25519Signer',
      credential: {
        secretKey: {
          hex: hexEncodeUintArray(identity.getKeyPair().secretKey),
        },
      },
    };
  }
  // exhaust
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const x: never = identity;
  throw new Error('unexpected identity prototype');
}
