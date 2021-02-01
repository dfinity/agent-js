import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import Container from '@material-ui/core/Container';
import HomeRoute from './routes/Home';
import React, { Suspense } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { IDPRootErrorBoundary } from './ErrorBoundary';
import theme from './theme';
import NotFound from "./routes/NotFound";
import RelyingPartyDemoRoute from "./relying-party-demo/routes";
import { IdentityChangedEventIdentifier } from './relying-party-demo/events';
import { Route as DesignPhase1Route } from "./design-phase-1";
import { WebAuthnIdentity } from '@dfinity/authentication';

const NotFoundRoute = () => {
  return <Route component={NotFound} />;
};

const App = () => {
  return (
    <IDPRootErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth='xl'>
          <Router>
            <Suspense fallback={<div>Loading...</div>}>
              <Switch>
                <Route path="/relying-party-demo">
                  <RelyingPartyDemoRoute NotFoundRoute={NotFoundRoute} />
                </Route>
                <Route exact path="/" component={HomeRoute} />
                <Route path="/design-phase-1">
                  <DesignPhase1Route
                    NotFoundRoute={NotFoundRoute}
                    WebAuthnIdentity={WebAuthnIdentity}
                  />
                </Route>
                <NotFoundRoute />
              </Switch>
            </Suspense>
          </Router>
        </Container>
      </ThemeProvider>
    </IDPRootErrorBoundary>
  );
};

async function _main() {
  // Example of
  document.body.addEventListener(IdentityChangedEventIdentifier, (event) => {
    console.log(IdentityChangedEventIdentifier, event)
  })
  render(<App />, document.body.getElementsByTagName('app').item(0));
}

_main().catch(err => {
  const div = document.createElement('div');
  div.innerText = 'An error happened:';
  const pre = document.createElement('pre');
  pre.innerHTML = err.stack;
  div.appendChild(pre);
  document.body.replaceChild(div, document.body.getElementsByTagName('app').item(0)!);
  throw err;
});
