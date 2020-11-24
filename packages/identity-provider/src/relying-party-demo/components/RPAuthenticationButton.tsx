import { Identity, PublicKey } from "@dfinity/agent";
import * as React from "react";
import { hexEncodeUintArray } from "src/bytes";
import { IDPAuthenticationRequest } from "src/protocol/ic-id-protocol";
import { OAuth2AuthorizationRequest } from "src/protocol/oauth2";

/** Convert an ic-id-protocol request to an OAuth 2.0 compliant request (just syntax transformation really) */
export function toOauth(idpRequest: IDPAuthenticationRequest): OAuth2AuthorizationRequest {
    const login_hint: string = hexEncodeUintArray(new Uint8Array(idpRequest.sessionIdentity.toDer()));
    const redirect_uri: string = idpRequest.redirectUri.toString();
    const oauthRequest: OAuth2AuthorizationRequest = {
        login_hint,
        redirect_uri,
    }
    return oauthRequest;
}

export default function RPAuthenticationButton(props: {
    children?: React.ReactNode;
    delegateTo: PublicKey;
    idpBaseUrl?: string;
  }) {
    // default to empty string, which should resolve everything relative to wherever this is used
    // (via relative HTML URLs like `/authorization` instead of absolute URLs like `https://id.ic0.app/authorization`)
    const { idpBaseUrl = "" } = props;
    const onClickAuthenticate = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const authenticationRequest: IDPAuthenticationRequest = {
          sessionIdentity: props.delegateTo,
          redirectUri: new URL(globalThis.location.href),
        };
        const authenticationRequestUrl = (() => {
          const url = new URL(`${idpBaseUrl}/authorization`, globalThis.location.href);
          for (const [key, value] of Object.entries(toOauth(authenticationRequest))) {
            url.searchParams.set(key, value);
          }
          return url;
        })();
        globalThis.location.assign(authenticationRequestUrl.toString());
      },
      [props.delegateTo, props.idpBaseUrl]
    );
    return (
      <>
        <button onClick={onClickAuthenticate}>
          {props.children || "Authenticate"}
        </button>
      </>
    );
  }
  