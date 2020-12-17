import * as t from "io-ts";
import { JsonCompatible, Jsonnable } from "./json";

export const IdentityProviderStateType = t.type({
    type: t.literal("IdentityProviderState"),
    loginHint: t.union([t.undefined, t.string])
})

export type IdentityProviderState = t.TypeOf<typeof IdentityProviderStateType>

/**
 * asserts that IdentityProviderState is compatible with plain JSON
 * If you must break this, consider declaring another type that represents the version of the state that *is* json-serializable.
*/
export type JsonnableIdentityProviderState = Jsonnable<IdentityProviderState>
