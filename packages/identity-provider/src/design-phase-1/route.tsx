import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Switch, useRouteMatch, useLocation, Redirect  } from 'react-router-dom';
import WelcomeScreen from './screens/WelcomeScreen';
import IdentityConfirmationScreen from './screens/IdentityConfirmationScreen';
import SessionConsentScreen from './screens/SessionConsentScreen';
import AuthenticationResponseConfirmationScreen from './screens/AuthenticationResponseConfirmationScreen';

export default function DesignPhase0Route(props: {
    NotFoundRoute: React.ComponentType
}) {
    const NotFoundRoute = props.NotFoundRoute;
    const location = useLocation()
    const { url, path } = useRouteMatch()
    const urls = {
        identity: {
            confirmation: `${path}/identity/confirmation`,
        },
        session: {
            consent: `${path}/session/consent`,
        },
        response: {
            confirmation: `${path}/response/confirmation`,
        }
    };
    return <>
        <Switch>
            <Route exact path={`${path}`}>
                <Redirect to={`${path}/welcome${location.search}`} />
            </Route>
            <Route exact path={`${path}/welcome`}>
                <WelcomeScreen
                    next={urls.identity.confirmation}
                />
            </Route>
            <Route exact path={urls.identity.confirmation}>
                <IdentityConfirmationScreen
                    next={urls.session.consent}
                />
            </Route>
            <Route exact path={urls.session.consent}>
                <SessionConsentScreen
                    next={urls.response.confirmation}
                />
            </Route>
            <Route exact path={urls.response.confirmation}>
                <AuthenticationResponseConfirmationScreen />
            </Route>
            <NotFoundRoute />
        </Switch>
    </>
}
