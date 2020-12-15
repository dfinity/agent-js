import * as React from "react";
import { useRouteMatch, useLocation } from "react-router-dom";
import * as oauth2 from "../../protocol/oauth2";
import * as icid from "../../protocol/ic-id-protocol";
import { DelegationChain, DelegationIdentity, Ed25519KeyIdentity } from "@dfinity/authentication";
import { hexEncodeUintArray } from "src/bytes";
import { RelyingPartyAuthenticationSessionStorage, IRelyingPartyAuthenticationSession } from "../session";
import { IStorage } from "../storage";
import { SignIdentity } from "@dfinity/agent";

export default function OAuthRedirectUriRoute(props: {
    backToRpDemoUrl: string;
    sessionStorage: IStorage<IRelyingPartyAuthenticationSession>;
    onIdentity(identity: SignIdentity|undefined): void;
}) {
    const { url, path } = useRouteMatch()
    const location = useLocation()
    const icAuthenticationResponse = icid.fromQueryString(new URLSearchParams(location.search))
    const parsedBearerToken = icid.parseBearerToken(icAuthenticationResponse.accessToken)
    const delegationChain = DelegationChain.fromJSON(JSON.stringify(parsedBearerToken))
    // @TODO(bengo): This Ed25519KeyIdentity needs to correspond to the sender_pubkey sent as login_hint
    // otherwise sigs won't actually be accepted by replica when `delegationIdentity.sign` is used by HttpAgent to sign each ic request id
    const session = props.sessionStorage.get()
    const identity = session?.identity
    const delegationIdentity = identity && DelegationIdentity.fromDelegation(identity, delegationChain)
    React.useEffect(
        () => {
            props.onIdentity(delegationIdentity)
        },
        [delegationIdentity]
    )
    return <>
        <h1>Creating Internet Computer Session&hellip;</h1>
        <p>(#todo) This RP page should handle the oauth AuthorizationResponse, create/store the session credential, and redirect to the final destination</p>
        <dl>
            <dt>AuthenticationResponse</dt><dd>
                <pre>{JSON.stringify(icAuthenticationResponse, null, 2)}</pre>
            </dd>
            <dt>Parsed Bearer Token</dt><dd>
                <details>
                    <pre>{JSON.stringify(parsedBearerToken, null, 2)}</pre>
                </details>
            </dd>
            <dt>delegationIdentity</dt><dd>
                {
                    delegationIdentity
                    ? <>
                        <dl>
                            <dt>publicKey (der)</dt><dd>{hexEncodeUintArray(delegationIdentity.getPublicKey().toDer())}</dd>
                            <dt>delegation</dt><dd>
                                <details>
                                    <pre>{JSON.stringify(
                                        delegationIdentity.getDelegation(), null, 2
                                    )}</pre>
                                </details>
                            </dd>
                        </dl>                    
                    </>
                    : <>
                        There is no delegationIdentity
                    </>
                }

            </dd>
        </dl>
        <a href={props.backToRpDemoUrl}>Restart Relying Party Demo</a>
    </>
}
