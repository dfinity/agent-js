import React, { lazy, Suspense } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

const Home = lazy(() => import('./routes/Home'));
const ImportKey = lazy(() => import('./routes/ImportKey'));

const App = () => {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Switch>
          <Route exact path='/' component={Home} />
          <Route path='/import' component={ImportKey} />
        </Switch>
      </Suspense>
    </Router>
  );
};

async function _main() {
  // @TODO: remove below once we actually reassign
  // tslint:disable-next-line: prefer-const
  // let token = '';
  // const masterKey = getMasterKey();
  // if (masterKey) {
  // authorize with WebAuthn
  // Authorization (COSE)
  // Setup delegations
  // return Delegate Key
  // } else {
  // create new master key
  // }
  // we've been successful
  // redirectToCanister(token);
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
