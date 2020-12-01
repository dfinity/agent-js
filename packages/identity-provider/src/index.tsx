import { CssBaseline, ThemeProvider } from '@material-ui/core';
import Container from '@material-ui/core/Container';
import HomeRoute from './routes/Home';
import React, { lazy, Suspense } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { IDPRootErrorBoundary } from './ErrorBoundary';
import { ProvideAuth } from './hooks/use-auth';
import theme from './theme';
import { ROUTES } from './utils/constants';
import NotFoundRoute from "./routes/NotFound";

const Login = lazy(() => import('./routes/Authorization'));
const KeyImport = lazy(() => import('./key-mgmt/key-import/routes/KeyImport'));
const KeyGeneration = lazy(() => import('./key-mgmt/key-generation/routes/KeyGeneration'));
const RelyingPartyDemo = lazy(() => import('./relying-party-demo/routes'))

const App = () => {
  return (
    <IDPRootErrorBoundary>
      <ProvideAuth>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Container maxWidth='md'>
            <Router>
              <Suspense fallback={<div>Loading...</div>}>
                <Switch>
                  <Route exact path={ROUTES.LOGIN} component={Login} />
                  <Route exact path={ROUTES.KEY_IMPORT} component={KeyImport} />
                  <Route exact path={ROUTES.KEY_GENERATION} component={KeyGeneration} />
                  <Route exact path={ROUTES.RELYING_PARTY_DEMO} component={RelyingPartyDemo} />
                  <Route exact path={ROUTES.HOME} component={HomeRoute} />
                  <Route component={NotFoundRoute} />
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
