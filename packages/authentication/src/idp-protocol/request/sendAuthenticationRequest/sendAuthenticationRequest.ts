import { SignIdentity } from '@dfinity/agent';
import { stringifyScope, Scope } from '../../scope';
import { AuthenticationRequest } from '../../request';
import { IdentityProviderAgentEnvelope, IdentityProviderIndicator, Transport } from './transport';
import { hexEncodeUintArray } from '../../bytes';

export type SendAuthenticationRequestCommand = {
  session: {
    identity: Pick<SignIdentity, 'getPublicKey'>;
  };
  redirectUri?: URL;
  scope: Scope;
};

/**
 * Initiate Authentication by sending an AuthenticationRequest to the Identity Provider. Intended for browser use
 * @param command - parameters to build the AuthenticationRequest
 * @param transport - instructs how to pass message along
 * @param identityProvider - url of the identity provider to use
 * @param redirectUri - Where identity provider should redirect back to
 */
export const sendAuthenticationRequest = async (
  command: SendAuthenticationRequestCommand,
  transport: Transport<IdentityProviderAgentEnvelope>,
  identityProvider: IdentityProviderIndicator,
  redirectUri?: string | URL,
): Promise<void> => {
  redirectUri = redirectUri ? redirectUri.toString() : location.toString();
  const authenticationRequest: AuthenticationRequest = {
    type: 'AuthenticationRequest',
    redirectUri,
    scope: stringifyScope(command.scope),
    sessionIdentity: {
      hex: hexEncodeUintArray(command.session.identity.getPublicKey().toDer()),
    },
  };
  await transport.send({
    to: identityProvider,
    message: authenticationRequest,
  });
};
