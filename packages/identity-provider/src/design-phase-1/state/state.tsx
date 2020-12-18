import * as t from "io-ts";
import { JsonCompatible, Jsonnable } from "./json";
import * as icid from "../../protocol/ic-id-protocol";

const PublicKeyType = t.type({
    hex: t.string,
})

const AuthenticationRequestCodec = t.type({
    type: t.literal('AuthenticationRequest'),
    redirectUri: t.string,
    sessionIdentity: t.type({
        hex: t.string,
    })
})

type IsAuthenticationRequest<T extends icid.AuthenticationRequest> = T;

type x = IsAuthenticationRequest<t.TypeOf<typeof AuthenticationRequestCodec>>;

export const IdentityProviderStateType = t.intersection([
    t.type({
        type: t.literal("IdentityProviderState"),
    }),
    t.partial({
        authenticationRequest: AuthenticationRequestCodec,
        identities: t.partial({
            root: t.partial({
                publicKey: t.union([
                    t.undefined,
                    PublicKeyType,
                ]),
                sign: t.union([
                    t.undefined,
                    t.type({
                        secretKey: t.type({
                            hex: t.string
                        })
                    }),
                ]),
            }),
        }),
        delegation: t.type({
            target: t.union([
                t.undefined,
                t.type({
                    publicKey: PublicKeyType,
                }),
            ]),
        })
    })
]);

export type IdentityProviderState = t.TypeOf<typeof IdentityProviderStateType>

/**
 * asserts that IdentityProviderState is compatible with plain JSON
 * If you must break this, consider declaring another type that represents the version of the state that *is* json-serializable.
*/
export type JsonnableIdentityProviderState = Jsonnable<IdentityProviderState>
