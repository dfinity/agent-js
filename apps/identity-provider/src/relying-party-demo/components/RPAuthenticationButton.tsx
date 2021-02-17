import { PublicKey } from '@dfinity/agent';
import * as React from 'react';
import { hexEncodeUintArray } from 'src/bytes';
import { Button } from 'src/components/Button';
import * as authentication from '@dfinity/authentication';

/**
 * Button that, when clicked, initiates authentication through an identityProviderUrl.
 * That URL should implement ic-id protocol.
 * @param props props
 * @param props.children - elements to render inside button, e.g. the text
 * @param props.delegateTo - PublicKey that will be used as request.login_hint
 * @param props.identityProviderUrl - URL of Identity Provider that will receive AuthenticationRequest
 * @param props.redirectUrl - URL that will receive AuthenticationResponse
 * @param props.scope - space-delimited string of scopes to request access to in response.access_token.
 *   Try space-delimited canister principals.
 * @param props.state - opaque string that will be echoed back in response
 * @param props.fullWidth - whether the button should render fullWidth.
 */
export default function RPAuthenticationButton(props: {
  children?: React.ReactNode;
  delegateTo: PublicKey;
  identityProviderUrl?: URL;
  redirectUrl: URL;
  state?: string;
  scope: string;
  fullWidth?: boolean;
}): JSX.Element {
  console.debug('RPAuthenticationButton', { scope: props.scope });
  // default to empty string, which should resolve everything relative to wherever this is used
  // (via relative HTML URLs like `/authorization` instead of absolute URLs like `https://id.ic0.app/authorization`)
  const {
    identityProviderUrl = new URL('/authorization', new URL(globalThis.location.toString())),
  } = props;
  const onClickAuthenticate = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const authenticationRequest: authentication.AuthenticationRequest = {
        type: 'AuthenticationRequest',
        sessionIdentity: {
          hex: hexEncodeUintArray(props.delegateTo.toDer()),
        },
        redirectUri: props.redirectUrl.toString(),
        state: props.state,
        scope: props.scope,
      };
      const authenticationRequestUrl = authentication.request.createAuthenticationRequestUrl({
        identityProviderUrl,
        authenticationRequest,
      });
      globalThis.location.assign(authenticationRequestUrl.toString());
    },
    [props.delegateTo, identityProviderUrl],
  );
  return (
    <>
      <Button color='primary' onClick={onClickAuthenticate} fullWidth={props.fullWidth}>
        {props.children || `Authenticate with ${identityProviderUrl.toString()}`}
      </Button>
    </>
  );
}
