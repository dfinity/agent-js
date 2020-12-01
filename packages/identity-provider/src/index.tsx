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

const Authorization = lazy(() => import('./authorization/routes/Authorization'));
const RPDemo = lazy(() => import('./relying-party-demo/routes/RPDemo'));

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
                  <Route path={ROUTES.AUTHORIZATION} component={Authorization} />
                  <Route path={ROUTES.RELYING_PARTY_DEMO} component={RPDemo} />
                  <Route path={ROUTES.HOME} component={HomeRoute} />
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
