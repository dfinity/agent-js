import { PublicKey } from "@dfinity/agent";
import * as React from "react";
import { hexEncodeUintArray } from "src/bytes";

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
        const derPublicKeyHex: string = hexEncodeUintArray(
          new Uint8Array(props.delegateTo.toDer())
        );
        const authenticationRequest: Record<
          "login_hint" | "redirect_uri",
          string
        > = {
          login_hint: derPublicKeyHex,
          redirect_uri: globalThis.location.toString(),
        };
        const authenticationRequestUrl = (() => {
          const url = new URL(`${idpBaseUrl}/authorization`, globalThis.location.href);
          for (const [key, value] of Object.entries(authenticationRequest)) {
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
  