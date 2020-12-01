import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Switch, useRouteMatch, useLocation  } from 'react-router-dom';
import RelyingPartyDemo from './RPDemo';
import OAuthRedirectUriRoute from './OAuthRedirectUri';

export default function RelyingPartyDemoRoute(props: {
    NotFoundRoute: React.ComponentType
}) {
    const NotFoundRoute = props.NotFoundRoute;
    const location = useLocation()
    const { url, path } = useRouteMatch()
    const redirectUriPath = `${path}/oauth/redirect_uri`
    const redirectUrl = new URL(redirectUriPath, globalThis.location.href)
    console.log('RelyingPartyDemoRoute', { url, path, redirectUrl, location, redirectUriPath })
    return <>
        <Switch>
            <Route exact path={`${path}`}>
                <RelyingPartyDemo
                    redirectUrl={redirectUrl}
                    />
            </Route>
            <Route exact path={redirectUriPath}>
                <OAuthRedirectUriRoute
                    backToRpDemoUrl={path}
                />
            </Route>
            <NotFoundRoute />
        </Switch>
    </>
}
