import * as React from "react";
import { useRouteMatch, useLocation } from "react-router-dom";
import * as oauth2 from "../../protocol/oauth2";
export default function OAuthRedirectUriRoute(props: {
    backToRpDemoUrl: string;
}) {
    const { url, path } = useRouteMatch()
    const location = useLocation()
    const authenticationResponse = oauth2.fromQueryString(new URLSearchParams(location.search))
    return <>
        <h1>Creating Internet Computer Session&hellip;</h1>
        <p>(#todo) This RP page should handle the oauth AuthorizationResponse, create/store the session credential, and redirect to the final destination</p>
        <pre>{JSON.stringify(authenticationResponse, null, 2)}</pre>
        <a href={props.backToRpDemoUrl}>Restart Relying Party Demo</a>
    </>
}
