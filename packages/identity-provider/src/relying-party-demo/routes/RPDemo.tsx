import { Ed25519KeyIdentity } from "@dfinity/authentication";
import { TextField } from "@material-ui/core";
import * as React from "react";
import RPAuthenticationButton from "../components/RPAuthenticationButton";
import { IRelyingPartyAuthenticationSession, RelyingPartyAuthenticationSessionSerializer, RelyingPartyAuthenticationSessionStorage } from "../session";
import { IStorage } from "../storage";

/**
 * Demo Route for testing out the Identity Provider functionality as a relying party.
 * In the wild, the RP should almost always be an entirely separate codebase.
 * This is just for testing/demoing while we proof of concept the whole integration.
 * 
 * What should it do?
 * * Show a button that the end-user can click to initiate the authentication flow (i.e. redirect to /authorization + AuthenticationRequest)
 * * @todo(bengo) - include a redirect_uri in the AuthenticationRequest that, when redirected back to with an AuthenticationResponse, does realistic things (i.e. shows the user the AuthenticationResponse that the RP redirct_uri receives)
 */
export default function RelyingPartyDemo(props: {
    redirectUrl: URL;
    sessionStorage: IStorage<IRelyingPartyAuthenticationSession>
    identityProviderUrl: URL;
}) {
    const identityProviderUrl = props.identityProviderUrl
    const [session, setSession] = React.useState<IRelyingPartyAuthenticationSession>({
        type: "RelyingPartyAuthenticationSession",
        identity: Ed25519KeyIdentity.generate(),
    });
    const [goalScope, setGoalScope] = React.useState<string>("canisterAPrincipalText canisterBPrincipalText");
    // Whenever session changes, serialize it and save to localStorage
    React.useEffect(() => {
        props.sessionStorage.set(session)
    }, [session])
    return <>
        <h1>Relying Party Demo</h1>
        <p>Click the button below to authenticate with the Internet Computer, authorizing the following session identity:</p>
        <pre>{RelyingPartyAuthenticationSessionSerializer.toJSON(session)}</pre>
        <form>
            <TextField
                helperText="Scope your AuthenticationRequest to ensure least privelege (only the Canisters you need to use now)"
                label="scope"
                fullWidth
                defaultValue="canisterAPrincipalText canisterBPrincipalText"
                onChange={(e) => setGoalScope(e.target.value)}
                />
        </form>
        <span data-test-id="authenticate">
            <RPAuthenticationButton
                fullWidth
                redirectUrl={props.redirectUrl}
                delegateTo={session.identity.getPublicKey()}
                identityProviderUrl={identityProviderUrl}
                state="RPDemo-sample-state"
                scope={goalScope}
            />
        </span>
    </>
}
