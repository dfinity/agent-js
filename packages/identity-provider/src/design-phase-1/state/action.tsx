import { StateStoredAction } from "./state-storage-react";
import * as icid from "../../protocol/ic-id-protocol";
import { Jsonnable } from "./json";

export type IdentityProviderAction =
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
