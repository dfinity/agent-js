import { appendTokenParameter, getRequiredQueryParams } from './identity-provider';
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
