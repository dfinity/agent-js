import { StateStoredAction } from "./state-storage-react";
import * as icid from "@dfinity/authentication";
import { Jsonnable } from "./json";
import { Action as AuthenticationAction } from "./reducers/authentication";
import { Action as WebAuthnAction } from "./reducers/webauthn.reducer";
import { Action as RootIdentityAction } from "./reducers/rootIdentity";
import { EffectRequested } from "./reducer-effects";
import { IdentityProviderState } from "./state";

export type AnyStandardAction = {
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any;
}

export type IdentityProviderActionSync =
| RootIdentityAction
| AuthenticationAction
| StateStoredAction<IdentityProviderState>
| WebAuthnAction
| { type: "reset" }
| { type: "AuthenticationRequestReceived",
    payload: icid.AuthenticationRequest }
| { type: "Navigate",
    payload: {
        href: string,
    }}


export type JsonnableAction = Jsonnable<IdentityProviderActionSync>

export type IdentityProviderAction =
| IdentityProviderActionSync
| EffectRequested<IdentityProviderActionSync>
