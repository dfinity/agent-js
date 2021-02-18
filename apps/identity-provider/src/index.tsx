import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import Container from '@material-ui/core/Container';
import HomeRoute from './routes/Home';
import React, { Suspense } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { IDPRootErrorBoundary } from './ErrorBoundary';
import theme from './theme';
import NotFound from './routes/NotFound';
import { WebAuthnIdentity } from '@dfinity/authentication';

const NotFoundRoute = () => {
  return <Route component={NotFound} />;
};

const App = () => {
  const DesignPhase1Route = React.lazy(() => import('./design-phase-1'));

  return (
    <IDPRootErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth='xl'>
          <Router>
            <Suspense fallback={<div>Loading...</div>}>
              <Switch>
                <Route exact path='/' component={HomeRoute} />
                <Route path='/design-phase-1'>
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

render(<App />, document.body.getElementsByTagName('app').item(0));
