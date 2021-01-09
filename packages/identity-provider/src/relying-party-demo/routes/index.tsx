import React, { lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Switch,
  useRouteMatch,
  useLocation,
  Redirect,
} from 'react-router-dom';
import RPOnboarding from './RPOnboarding';
import RPLanding from './RPLanding';
import AuthnRedirectUri from './AuthnRedirectUri';
import { RelyingPartyAuthenticationSessionStorage } from '../session';
import { DelegationIdentity } from '@dfinity/authentication';
import { IdentityChangedEvent } from '../events';
import { SignIdentity } from '@dfinity/agent';

export default function RelyingPartyDemoRoute(props: { NotFoundRoute: React.ComponentType }) {
  const NotFoundRoute = props.NotFoundRoute;
  const location = useLocation();
  const { url, path } = useRouteMatch();
  const redirectUriPath = `${path}/oauth/redirect_uri`;
  const redirectUrl = new URL(redirectUriPath, globalThis.location.href);
  const sessionStorage = RelyingPartyAuthenticationSessionStorage('RelyingPartyDemo/session');
  /** Function to publish that there is a new @dfinity/agent SignIdentity that should be used by all instances of @dfinity/agent that know how to use it. */
  const publishIdentity = (identity: SignIdentity) => {
    globalThis.document.body.dispatchEvent(IdentityChangedEvent(identity));
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
          <RPLanding />
        </Route>
        <Route exact path={`${path}/onboarding`}>
          <RPOnboarding {...{ identityProviderUrl, redirectUrl, sessionStorage }} />
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
