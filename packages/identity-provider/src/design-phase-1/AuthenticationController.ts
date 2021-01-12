import { IdentityProviderAction } from './state/action';
import { Ed25519KeyIdentity, DelegationChain } from '@dfinity/authentication';
import { hexEncodeUintArray, hexToBytes } from 'src/bytes';
import * as icid from '../protocol/ic-id-protocol';
import { PublicKey, SignIdentity, blobFromUint8Array } from '@dfinity/agent';
import tweetnacl from 'tweetnacl';
import { AuthenticationResponseConsentProposal } from './ui/screens/SessionConsentScreen';

interface IAuthenticationController {
  /**
   * Create a brand new root profile for a new end-user
   */
  createProfile(): IdentityProviderAction[];
  createAuthenticationResponse(spec: {
    request: icid.AuthenticationRequest;
    delegationTail: PublicKey;
    rootIdentity: SignIdentity;
  }): Promise<icid.AuthenticationResponse>;
  consentToAuthenticationResponseProposal(spec: {
      consentProposal: AuthenticationResponseConsentProposal,
      consenter: {
          publicKey: {
              hex: string
          }
      }
  }): IdentityProviderAction[]
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
    createProfile() {
      const profileSignIdentity = Ed25519KeyIdentity.generate();
      const profileCreated: IdentityProviderAction = {
        type: 'ProfileCreated',
        payload: {
          publicKey: {
            hex: hexEncodeUintArray(new Uint8Array(profileSignIdentity.getPublicKey().toDer())),
          },
        },
      };
      const delegationRootSignerChanged: IdentityProviderAction = {
        type: 'DelegationRootSignerChanged',
        payload: {
          secretKey: {
            hex: hexEncodeUintArray(profileSignIdentity.getKeyPair().secretKey),
          },
        },
      };
      const navigate: IdentityProviderAction = {
        type: 'Navigate',
        payload: {
          href: urls.identity.confirmation,
        },
      };
      const effects = [profileCreated, delegationRootSignerChanged, navigate];
      return effects;
    },
    async createAuthenticationResponse(spec: {
      request: icid.AuthenticationRequest;
      delegationTail: PublicKey;
      rootIdentity: SignIdentity;
    }): Promise<icid.AuthenticationResponse> {
      const parsedScope = icid.parseScopeString(spec.request.scope);
      const response: icid.AuthenticationResponse = {
        type: 'AuthenticationResponse',
        accessToken: icid.createBearerToken({
          delegationChain: await DelegationChain.create(
            spec.rootIdentity,
            spec.delegationTail,
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
      return response;
    },
    consentToAuthenticationResponseProposal: function consent (spec: {
      consentProposal: AuthenticationResponseConsentProposal,
      consenter: {
          publicKey: {
              hex: string
          }
      }
  }) {
      const { consentProposal } = spec;
      console.debug('consentToAuthenticationResponseProposal', { consentProposal})
      const consentReceivedAction: IdentityProviderAction = {
        type: "AuthenticationRequestConsentReceived",
        payload: {
            consent: {
                type: "AuthenticationRequestConsent",
                proposal: {
                    request: consentProposal.request,
                    attributedTo: spec.consenter
                },
                createdAt: { iso8601: (new Date).toISOString() },
            }
        }
    }
    return [consentReceivedAction]
  }
  };
  return idpController;
}

/** return days since epoch as js Date object */
function days(count: number) {
  const msInOneDay = 1000 * 60 * 60 * 24;
  return new Date(msInOneDay * count);
}
