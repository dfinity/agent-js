import { shallow, mount } from 'enzyme';
import * as React from 'react';
import { WebAuthnIdentity } from '@dfinity/authentication';
import { useReducer } from '../state-react';
import { hexEncodeUintArray, hexToBytes } from '../../../bytes';
import {act} from 'react-dom/test-utils';
import assert from 'assert';
import WebAuthnReducer from "./webauthn.reducer";
import { Action } from "./webauthn.reducer";

describe('@dfinity/identity-provider/design-phase-1/reducers/webauthn.reducer', () => {
  it('works', async () => {
    const actions: Action[] = [];
    const reducer = WebAuthnReducer({
      forEachAction(action: Action) {
        // store for assertions
        actions.push(action);
      },
      WebAuthn: {
        async create() {
          return WebAuthnIdentity.fromJSON(JSON.stringify({
            publicKey: hexEncodeUintArray(Uint8Array.from([])),
            rawId: hexEncodeUintArray(Uint8Array.from([])),
          }));
        }
      }
    });
    const Component: React.FunctionComponent = () => {
      const [state, dispatch] = useReducer(reducer);
      const [didClick, setDidClick] = React.useState(false);
      function onClickButton() {
        setDidClick(true);
      }
      React.useEffect(
        () => {
          if ( ! didClick) return;
          dispatch({
            type: "WebAuthn/publicKeyCredentialRequested",
          })
        },
        [didClick]
      )
      return <>
        TestComponent
        <button onClick={onClickButton}>Click Me</button>
        {didClick && <span className='didClick'>didClick!</span>}
      </>
    }
    const el = mount(<Component />)
    const button = el.find('button');
    button.simulate('click');
    expect(el.text()).toContain('didClick!')
    await act(async () => {}) // wait for async effects
    const publicKeyCredentialCreatedAction = actions.find(({ type }) => type === 'WebAuthn/publicKeyCredentialCreated')
    assert.ok(publicKeyCredentialCreatedAction);
    switch (publicKeyCredentialCreatedAction.type) {
      case "WebAuthn/publicKeyCredentialCreated":
        const { credential } = publicKeyCredentialCreatedAction.payload;
        const publicKey = Uint8Array.from(hexToBytes(credential.publicKey.hex))
        const credentialId = Uint8Array.from(hexToBytes(credential.id.hex))
        expect(publicKey.length).toBeGreaterThan(0);
        expect(credentialId.length).toBeGreaterThan(0);
        break;
      default:
        throw new Error('expected to find action of type "WebAuthn/publicKeyCredentialCreated"')
    }
  });
});
