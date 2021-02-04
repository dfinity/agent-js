import * as React from "react";
import { useLocation } from "react-router-dom";
import * as icid from "@dfinity/authentication";
import { DelegationChain, DelegationIdentity } from "@dfinity/authentication";
import { hexEncodeUintArray } from "../../bytes";
import { IRelyingPartyAuthenticationSession } from "../session";
import { IStorage } from "../storage";
import { SignIdentity } from "@dfinity/agent";

/**
 * Handler of ic-id AuthenticationResponse.
 * Create a route to this, then use that route as the AuthenticationRequest.redirect_uri.
 * 
 * What should it do?
 * * detect AuthenticationResponse in document.location.
 * * attempt to create DelegationIdentity from AuthenticationResponse.
 * * render the AuthenticationResponse + DelegationIdentity to the end-user so they can make sense of it.
 * 
 * @param props props
 * @param props.backToRpDemoUrl - URL to navigate to when someone clicks "Restart Relying Party Demo"
 * @param props.sessionStorage - object that knows how to store sessions
 * @param props.onIdentity - callback to call when a new Identity is constructed.
 */
export default function OAuthRedirectUriRoute(props: {
    backToRpDemoUrl: string;
    sessionStorage: IStorage<IRelyingPartyAuthenticationSession>;
    onIdentity(identity: SignIdentity|undefined): void;
}): JSX.Element {
    const location = useLocation()
    const icAuthenticationResponse = React.useMemo(
        () => {
            const message = icid.response.fromQueryString(new URLSearchParams(location.search));
            if (message && (message.type === "AuthenticationResponse")) {
                return message;
            }
        },
        [location.search]
    )
    const parsedBearerToken = icAuthenticationResponse && icid.response.parseBearerToken(icAuthenticationResponse.accessToken)
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
