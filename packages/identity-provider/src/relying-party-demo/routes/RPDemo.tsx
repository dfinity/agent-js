import { Ed25519KeyIdentity } from "@dfinity/authentication";
import * as React from "react";
import RPAuthenticationButton from "../components/RPAuthenticationButton";

export interface RelyingPartyAuthenticationSession {
    identity: Ed25519KeyIdentity
}

/**
 * Demo Route for testing out the Identity Provider functionality as a relying party.
 * In the wild, the RP should almost always be an entirely separate codebase.
 * This is just for testing/demoing while we proof of concept the whole integration.
 * 
 * What should it do?
 * * Show a button that the end-user can click to initiate the authentication flow (i.e. redirect to /authorization + AuthenticationRequest)
 * * @todo(bengo) - include a redirect_uri in the AuthenticationRequest that, when redirected back to with an AuthenticationResponse, does realistic things (i.e. shows the user the AuthenticationResponse that the RP redirct_uri receives)
 */
export default function RelyingPartyDemo() {
    const [session, setSession] = React.useState<RelyingPartyAuthenticationSession>({
        identity: Ed25519KeyIdentity.generate(),
    });
    return <>
        <h1>Relying Party Demo</h1>
        <RPAuthenticationButton
            delegateTo={session.identity.getPublicKey()}
        />
    </>
}
