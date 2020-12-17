import { StateStoredAction } from "./state-storage-react";

export type IdentityProviderAction =
| StateStoredAction
| { type: "ProfileCreated",
    payload: {
        publicKey: ArrayBuffer
    }}
| { type: "reset" }
| { type: "AuthenticationRequestReceived",
    payload: {
        loginHint: string,
    }}
| { type: "Navigate",
    payload: {
        href: string,
    }}
