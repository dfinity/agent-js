import { StateStoredAction } from "./state-storage-react";
import * as icid from "../../protocol/ic-id-protocol";
import { Jsonnable } from "./json";
import { Action as AuthenticationAction } from "./reducers/authentication";

export type IdentityProviderAction =
| AuthenticationAction
| StateStoredAction
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

export type JsonnableAction = Jsonnable<IdentityProviderAction>
