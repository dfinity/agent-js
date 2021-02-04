import * as React from 'react';
import { Route, Switch, useRouteMatch, Redirect } from 'react-router-dom';
import RelyingPartyDemo from './RPDemo';
import AuthnRedirectUri from './AuthnRedirectUri';
import { RelyingPartyAuthenticationSessionStorage } from '../session';
import { RelyingPartyDemoIdentityChangedEvent } from '../events';
import { SignIdentity } from '@dfinity/agent';

/**
 * Component for the RelyingPartyDemo, as a react-router Route Switch.
 * @param props props
 * @param props.NotFoundRoute - renderable Component to render when showing a 'Not Found' error page (location doesn't match any route).
 */
export default function RelyingPartyDemoRoute(props: {
  NotFoundRoute: React.ComponentType;
}): JSX.Element {
  const NotFoundRoute = props.NotFoundRoute;
  const { path } = useRouteMatch();
  const redirectUriPath = `${path}/oauth/redirect_uri`;
  const redirectUrl = new URL(redirectUriPath, globalThis.location.href);
  const sessionStorage = RelyingPartyAuthenticationSessionStorage('RelyingPartyDemo/session');
  /**
   * Function to publish that there is a new @dfinity/agent SignIdentity that should be used by all instances of @dfinity/agent that know how to use it.
   * @param identity - newly current identity to publish to all subscribers
   */
  const publishIdentity = (identity: SignIdentity) => {
    globalThis.document.body.dispatchEvent(RelyingPartyDemoIdentityChangedEvent(identity));
  };
  const identityProviderUrl = new URL(
    new URLSearchParams(globalThis.location.search).get('idp') ||
      new URL('/authorization', new URL(globalThis.location.toString())).toString(),
    globalThis.location.href,
  );
  return (
    <>
      <Switch>
        <Route exact path={`${path}`}>
          <RelyingPartyDemo {...{ identityProviderUrl, redirectUrl, sessionStorage }} />
        </Route>
        <Route exact path={`${path}/design-phase-1`}>
          <Redirect to={`${path}/?idp=/design-phase-1`} />
        </Route>
        <Route exact path={redirectUriPath}>
          <AuthnRedirectUri
            backToRpDemoUrl={path}
            sessionStorage={sessionStorage}
            onIdentity={publishIdentity}
          />
        </Route>
        <NotFoundRoute />
      </Switch>
    </>
  );
}
