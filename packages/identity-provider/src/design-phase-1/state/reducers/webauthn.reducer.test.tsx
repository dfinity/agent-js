import { shallow, mount } from 'enzyme';
import * as React from 'react';
import { WebAuthnIdentity } from '@dfinity/authentication';
import { IdentityProviderAction } from '../action';
import { useReducer, IReducerObject } from '../state-react';
import { hexEncodeUintArray, hexToBytes } from '../../../bytes';
import {act} from 'react-dom/test-utils';
import assert from 'assert';

interface State {
  foo: string;
}

type Action = 
| {
  type: "WebAuthn/reset",
  payload: undefined
  }
| {
    type: "WebAuthn/createRequested"
  }
| {
  type: "WebAuthn/publicKeyCredentialCreated"
  payload: {
    credential: {
      id: {
        hex: string;
      };
      publicKey: { hex: string }
    }
  }
}

function WebAuthnReducer(spec: {
  /** Useful for logging effects */
  forEachAction?(action: Action): void
  WebAuthn: {
    create(): Promise<WebAuthnIdentity>
  }
}): IReducerObject<State, Action> {
  return Object.freeze({ init, reduce, effect });
  function init(): State {
    return {
      foo: 'init',
    }
  }
  function reduce(state: State, action: Action): State {
    if (spec.forEachAction) spec.forEachAction(action);
    return state;
  }
  function effect(action: Action): undefined|Promise<Action[]> {
    switch (action.type) {
      case "WebAuthn/createRequested":
        return (async () => {
          const webAuthnIdentity = await spec.WebAuthn.create();
          const publicKeyCredentialCreated: Action = {
            type: "WebAuthn/publicKeyCredentialCreated" as const,
            payload: {
              credential: {
                id: { hex: 'todoCredentialId' },
                publicKey: {
                  hex: hexEncodeUintArray(webAuthnIdentity.getPublicKey().toDer()),
                }
              }
            }
          }
          return [publicKeyCredentialCreated]
        })();
      default:
    }
  }
}

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
            type: "WebAuthn/createRequested",
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
        expect(publicKeyCredentialCreatedAction.type).toEqual('publicKeyCredentialCreatedAction.type')
    }
  });
});
