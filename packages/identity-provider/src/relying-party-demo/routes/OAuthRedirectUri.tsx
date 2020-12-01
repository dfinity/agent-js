import * as React from "react";
import { useRouteMatch, useLocation } from "react-router-dom";

export default function OAuthRedirectUriRoute(props: {
    backToRpDemoUrl: string;
}) {
    const { url, path } = useRouteMatch()
    const location = useLocation()
    const params = React.useMemo(() => {
        let o = {};
        new URLSearchParams(location.search).forEach((value, key) => {
            (o as any)[key] = value;
        })
        return o
    }, [location])
    return <>
        <h1>Creating Internet Computer Session&hellip;</h1>
        <p>(#todo) This RP page should handle the oauth AuthorizationResponse, create/store the session credential, and redirect to the final destination</p>
        <pre>{JSON.stringify(params, null, 2)}</pre>
        <a href={props.backToRpDemoUrl}>Restart Relying Party Demo</a>
    </>
}
