import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import Container from '@material-ui/core/Container';
import HomeRoute from './routes/Home';
import React, { lazy, Suspense } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { IDPRootErrorBoundary } from './ErrorBoundary';
import { ProvideAuth } from './hooks/use-auth';
import theme from './theme';
import { ROUTES } from './utils/constants';
import NotFound from "./routes/NotFound";
import RelyingPartyDemoRoute from "./relying-party-demo/routes";
import { IdentityChangedEvent, IdentityChangedEventIdentifier } from './relying-party-demo/events';

const Authorization = lazy(() => import('./authorization/routes/Authorization'));

const NotFoundRoute = () => {
  return <Route component={NotFound} />;
};

const App = () => {
  return (
    <IDPRootErrorBoundary>
      <ProvideAuth>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Container maxWidth='xl'>
            <Router>
              <Suspense fallback={<div>Loading...</div>}>
                <Switch>
                  <Route exact path={ROUTES.AUTHORIZATION} component={Authorization} />
                  <Route path={ROUTES.RELYING_PARTY_DEMO}>
                    <RelyingPartyDemoRoute NotFoundRoute={NotFoundRoute} />
                  </Route>
                  <Route exact path={ROUTES.HOME} component={HomeRoute} />
                  <NotFoundRoute />
                </Switch>
              </Suspense>
            </Router>
          </Container>
        </ThemeProvider>
      </ProvideAuth>
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
