import { Ed25519KeyIdentity } from "@dfinity/authentication";
import { TextField } from "@material-ui/core";
import * as React from "react";
import RPAuthenticationButton from "../components/RPAuthenticationButton";
import { IRelyingPartyAuthenticationSession, RelyingPartyAuthenticationSessionSerializer } from "../session";
import { IStorage } from "../storage";

/**
 * Demo Route for testing out the Identity Provider functionality as a relying party.
 * In the wild, the RP should almost always be an entirely separate codebase.
 * This is just for testing/demoing while we proof of concept the whole integration.
 * 
 * What should it do?
 * * Show a button that the end-user can click to initiate the authentication flow (i.e. redirect to /authorization + AuthenticationRequest)
 *
 * @param props props
 * @param props.redirectUrl - URL to send AuthenticationResponses to
 * @param props.sessionStorage - object that stores sessions, required for persisting sessions across page loads
 * @param props.identityProviderUrl - URL of ic-id Identity Provider to send AuthenticationRequests to
 */
export default function RelyingPartyDemo(props: {
    redirectUrl: URL;
    sessionStorage: IStorage<IRelyingPartyAuthenticationSession>
    identityProviderUrl: URL;
}): JSX.Element {
    const identityProviderUrl = props.identityProviderUrl
    const [session] = React.useState<IRelyingPartyAuthenticationSession>({
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
