import { IdentityProviderAction } from './state/action';
import { Ed25519KeyIdentity, DelegationChain, WebAuthnIdentity } from '@dfinity/authentication';
import { hexEncodeUintArray, hexToBytes } from 'src/bytes';
import * as icid from '../protocol/ic-id-protocol';
import {
  PublicKey,
  SignIdentity,
  blobFromUint8Array,
  derBlobFromBlob,
  blobFromHex,
} from '@dfinity/agent';
import tweetnacl from 'tweetnacl';
import { AuthenticationResponseConsentProposal } from './state/reducers/authentication';

/**
 * 'Controllers' can be useful as an Abstraction for state mutations that all have to do with a common use case or business requirement.
 * A Controller method can be be thought of as taking a request and returning some Effects. Here we define 'EffectCreator' to refer to this pattern.
 * A controller with many methods is a map of names to EffectCreators, i.e. an EffectCreatorMap.
 * This separates concerns of creating effects and publishing them.
 * Assert that 'controller objects' extend EffectCreatorMap to be sure that all controller methods return effects (instead of having untyped side-effects of the invocation, e.g. a dispatch())
 */
type EffectCreator<Effect> = (...args: any[]) => Promise<Effect[]>;
type EffectCreatorMap<EffectCreatorNames extends string, Effect extends { type: string }> = {
  [key in EffectCreatorNames]: EffectCreator<Effect>;
};

interface IAuthenticationController extends EffectCreatorMap<string, IdentityProviderAction> {
  /**
   * Create a brand new root profile for a new end-user
   */
  createProfile(): Promise<IdentityProviderAction[]>;
  /**
   * Respond to the AuthenticationRequest with an AuthenticationResponse.
   * Send the AuthenticationResponse to redirect_uri via Navigate effect
   */
  respond(spec: {
    request: Pick<icid.AuthenticationRequest, 'redirectUri'>;
    response: icid.AuthenticationResponse;
  }): Promise<IdentityProviderAction[]>;
  consentToAuthenticationResponseProposal(spec: {
    consentProposal: AuthenticationResponseConsentProposal;
    consenter: SignIdentity;
  }): Promise<IdentityProviderAction[]>;
}

export default function AuthenticationController(options: {
  urls: {
    identity: {
      confirmation: string;
    };
  };
}): IAuthenticationController {
  const { urls } = options;
  const idpController: IAuthenticationController = {
    async createProfile() {
      const webAuthnIdentity = await WebAuthnIdentity.create();
      const delegationRootSignerChangedWebAuthn: IdentityProviderAction = {
        type: 'DelegationRootSignerChanged',
        payload: {
          signer: {
            type: 'WebAuthnIdentitySigner',
            json: JSON.stringify(webAuthnIdentity.toJSON()),
          },
        },
      };
      const navigate: IdentityProviderAction = {
        type: 'Navigate',
        payload: {
          href: urls.identity.confirmation,
        },
      };
      const effects = [delegationRootSignerChangedWebAuthn, navigate];
      return effects;
    },
    async respond(spec: {
      request: Pick<icid.AuthenticationRequest, 'redirectUri'>;
      response: icid.AuthenticationResponse;
    }): Promise<IdentityProviderAction[]> {
      const responseRedirectUrl = icid.createResponseRedirectUrl(
        spec.response,
        spec.request.redirectUri,
      );
      const navigateToRedirectUriWithResponse: IdentityProviderAction = {
        type: 'Navigate',
        payload: {
          href: responseRedirectUrl.toString(),
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
      const parsedScope = icid.parseScopeString(spec.consentProposal.request.scope);
      const delegationTail: PublicKey = {
        toDer() {
          return derBlobFromBlob(blobFromHex(spec.consentProposal.request.sessionIdentity.hex));
        },
      };
      const response: icid.AuthenticationResponse = {
        type: 'AuthenticationResponse',
        accessToken: icid.createBearerToken({
          delegationChain: await DelegationChain.create(
            spec.consenter,
            delegationTail,
            new Date(Date.now() + Number(days(1))) /* 24hr expiry */,
            {
              targets: parsedScope.canisters.map(({ principal }) => principal),
            },
          ),
        }),
        expiresIn: 10000000,
        tokenType: 'bearer',
        scope: icid.stringifyScope(parsedScope),
      };
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

      const responsePreparedAction: IdentityProviderAction = {
        type: 'AuthenticationResponsePrepared',
        payload: response,
      };
      return [consentReceivedAction];
    },
  };
  return idpController;
}

/** return days since epoch as js Date object */
function days(count: number) {
  const msInOneDay = 1000 * 60 * 60 * 24;
  return new Date(msInOneDay * count);
}
