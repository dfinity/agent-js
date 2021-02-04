import * as t from "io-ts";
import { Jsonnable } from "./json";
import { StateCodec as DelegationStateCodec } from "./reducers/delegation"
import { StateCodec as RootIdentityStateCodec } from "./reducers/rootIdentity"
import { StateCodec as AuthenticationStateCodec } from "./reducers/authentication"
import { StateCodec as WebAuthnStateCodec } from "./reducers/webauthn.reducer"

export const IdentityProviderStateType = t.type({
    authentication: AuthenticationStateCodec,
    delegation: DelegationStateCodec,
    identities: t.type({
        root: RootIdentityStateCodec,
    }),
    webAuthn: WebAuthnStateCodec,
})

export type IdentityProviderState = t.TypeOf<typeof IdentityProviderStateType>

/**
 * asserts that IdentityProviderState is compatible with plain JSON
 * If you must break this, consider declaring another type that represents the version of the state that *is* json-serializable.
 */
export type JsonnableIdentityProviderState = Jsonnable<IdentityProviderState>
