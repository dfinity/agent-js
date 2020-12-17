import { StateStoredAction } from "./state-storage-react";

export type IdentityProviderAction =
| StateStoredAction
| { type: "reset" }
| { type: "AuthenticationRequestReceived",
    payload: {
        loginHint: string,
    }}
