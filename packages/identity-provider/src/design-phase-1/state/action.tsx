import { StateStoredAction } from "./state-storage-react";
import * as icid from "../../protocol/ic-id-protocol";
import { Jsonnable } from "./json";
import { Action as AuthenticationAction } from "./reducers/authentication";
import { Action as WebAuthnAction } from "./reducers/webauthn.reducer";
import { EffectRequested, EffectLifecycleAction } from "./reducer-effects";

export type AnyStandardAction = {
    type: string;
    payload?: any;
}

export type IdentityProviderActionSync =
| AuthenticationAction
| StateStoredAction
| WebAuthnAction
| { type: "ProfileCreated",
    payload: {
        publicKey: {
            hex: string
        }
    }}
| { type: "reset" }
| { type: "AuthenticationRequestReceived",
    payload: icid.AuthenticationRequest }
| { type: "Navigate",
    payload: {
        href: string,
    }}
| {
    type: "DelegationRootSignerChanged",
    payload: {
        secretKey: { hex: string }
    }
}

export type JsonnableAction = Jsonnable<IdentityProviderActionSync>

export type IdentityProviderAction =
| IdentityProviderActionSync
| EffectRequested<IdentityProviderActionSync>
