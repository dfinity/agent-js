import { CssBaseline, ThemeProvider } from '@material-ui/core';
import Container from '@material-ui/core/Container';
import React, { lazy, Suspense } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import theme from './theme';

const Home = lazy(() => import('./routes/Home'));
const ImportKey = lazy(() => import('./routes/ImportKey'));

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth={'sm'}>
        <Router>
          <Suspense fallback={<div>Loading...</div>}>
            <Switch>
              <Route exact path={'/'} component={Home} />
              <Route path={'/import'} component={ImportKey} />
            </Switch>
          </Suspense>
        </Router>
      </Container>
    </ThemeProvider>
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
