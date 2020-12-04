import * as React from "react";
import { useRouteMatch, useLocation } from "react-router-dom";
import * as oauth2 from "../../protocol/oauth2";
import * as icid from "../../protocol/ic-id-protocol";
export default function OAuthRedirectUriRoute(props: {
    backToRpDemoUrl: string;
}) {
    const { url, path } = useRouteMatch()
    const location = useLocation()
    const icAuthenticationResponse = icid.fromQueryString(new URLSearchParams(location.search))
    const parsedBearerToken = icid.parseBearerToken(icAuthenticationResponse.accessToken)
    return <>
        <h1>Creating Internet Computer Session&hellip;</h1>
        <p>(#todo) This RP page should handle the oauth AuthorizationResponse, create/store the session credential, and redirect to the final destination</p>
        <dl>
            <dt>AuthenticationResponse</dt><dd>
                <pre>{JSON.stringify(icAuthenticationResponse, null, 2)}</pre>
            </dd>
            <dt>Parsed Bearer Token</dt><dd>
                <pre>{JSON.stringify(parsedBearerToken, null, 2)}</pre>
            </dd>
        </dl>
        <a href={props.backToRpDemoUrl}>Restart Relying Party Demo</a>
    </>
}
