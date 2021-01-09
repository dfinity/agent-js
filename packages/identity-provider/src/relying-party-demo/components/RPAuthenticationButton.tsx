import { Identity, PublicKey } from "@dfinity/agent";
import * as React from "react";
import { hexEncodeUintArray } from "src/bytes";
import { Button } from "src/components/Button";
import { AuthenticationResponse, AuthenticationRequest, createAuthenticationRequestUrl } from "src/protocol/ic-id-protocol";
import { OAuth2AuthorizationRequest } from "src/protocol/oauth2";

export default function RPAuthenticationButton(props: {
    children?: React.ReactNode;
    delegateTo: PublicKey;
    identityProviderUrl?: URL;
    redirectUrl: URL;
    state?: string;
    scope: string;
    fullWidth?: boolean;
  }) {
    console.debug('RPAuthenticationButton', { scope: props.scope })
    // default to empty string, which should resolve everything relative to wherever this is used
    // (via relative HTML URLs like `/authorization` instead of absolute URLs like `https://id.ic0.app/authorization`)
    const { identityProviderUrl = new URL('/authorization', new URL(globalThis.location.toString())) } = props;
    const onClickAuthenticate = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const authenticationRequest: AuthenticationRequest = {
          type: "AuthenticationRequest",
          sessionIdentity: {
            hex: hexEncodeUintArray(props.delegateTo.toDer()),
          },
          redirectUri: props.redirectUrl.toString(),
          state: props.state,
          scope: props.scope,
        };
        const authenticationRequestUrl = createAuthenticationRequestUrl({
          identityProviderUrl,
          authenticationRequest,
        });
        globalThis.location.assign(authenticationRequestUrl.toString());
      },
      [props.delegateTo, identityProviderUrl]
    );
    return (
      <>
        <Button color="primary" onClick={onClickAuthenticate} fullWidth={props.fullWidth}>
          {props.children || `Authenticate with ${identityProviderUrl.toString()}`}
        </Button>
      </>
    );
  }
`;
