import { CssBaseline, ThemeProvider } from '@material-ui/core';
import Container from '@material-ui/core/Container';
import React, { lazy, Suspense } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Redirect, Route, Switch, useParams } from 'react-router-dom';
import theme from './theme';
import { ROUTES } from './utils/constants';
import { IDPRootErrorBoundary } from './ErrorBoundary';

const Login = lazy(() => import('./routes/Login'));
const KeyImport = lazy(() => import('./routes/KeyImport'));
const KeyGeneration = lazy(() => import('./routes/KeyGeneration'));

const App = () => {
  return (
    <IDPRootErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth='md'>
          <Router>
            <Suspense fallback={<div>Loading...</div>}>
              <Switch>
                <Route path={ROUTES.LOGIN} component={Login} />
                <Route path={ROUTES.KEY_IMPORT} component={KeyImport} />
                <Route path={ROUTES.KEY_GENERATION} component={KeyGeneration} />
              </Switch>
            </Suspense>
          </Router>
        </Container>
      </ThemeProvider>
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
