import { Identity, PublicKey } from '@dfinity/agent';
import { css } from '@emotion/css';
import { Button } from '@material-ui/core';
import * as React from 'react';
import { hexEncodeUintArray } from 'src/bytes';
import { AuthenticationResponse, AuthenticationRequest } from 'src/protocol/ic-id-protocol';
import { OAuth2AuthorizationRequest } from 'src/protocol/oauth2';

/** Convert an ic-id-protocol request to an OAuth 2.0 compliant request (just syntax transformation really) */
export function toOauth(idpRequest: AuthenticationRequest): OAuth2AuthorizationRequest {
  const login_hint: string = idpRequest.sessionIdentity.hex;
  const redirect_uri: string = idpRequest.redirectUri.toString();
  const oauthRequest: OAuth2AuthorizationRequest = {
    login_hint,
    redirect_uri,
  };
  return oauthRequest;
}

export default function RPAuthenticationButton(props: {
  children?: React.ReactNode;
  delegateTo: PublicKey;
  identityProviderUrl?: URL;
  redirectUrl: URL;
  state?: string;
}) {
  // default to empty string, which should resolve everything relative to wherever this is used
  // (via relative HTML URLs like `/authorization` instead of absolute URLs like `https://id.ic0.app/authorization`)
  const {
    identityProviderUrl = new URL('/authorization', new URL(globalThis.location.toString())),
  } = props;
  const onClickAuthenticate = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const authenticationRequest: AuthenticationRequest = {
        type: 'AuthenticationRequest',
        sessionIdentity: {
          hex: hexEncodeUintArray(props.delegateTo.toDer()),
        },
        redirectUri: props.redirectUrl.toString(),
        state: props.state,
      };
      const authenticationRequestUrl = (() => {
        const url = new URL(identityProviderUrl.toString());
        for (const [key, value] of Object.entries(toOauth(authenticationRequest))) {
          url.searchParams.set(key, value);
        }
        return url;
      })();
      globalThis.location.assign(authenticationRequestUrl.toString());
    },
    [props.delegateTo, identityProviderUrl],
  );
  return (
    <>
      <Button
        id='authentication-button'
        className={buttonCss}
        color='primary'
        type='button'
        onClick={onClickAuthenticate}
      >
        {props.children || `Authenticate with ${identityProviderUrl.toString()}`}
      </Button>
    </>
  );
}

const buttonCss = css`
  &#authentication-button {
    width: fit-content;
    margin: 40px 0;
  }
`;
