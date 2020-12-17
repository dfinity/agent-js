import { shallow, mount } from 'enzyme';
import * as React from "react";
import { useReducer } from "./reducer";

describe('@dfinity/identity-provider/design-phase-0/reducer', () => {
    it('works', () => {
        const sampleLoginHint: string = "302a300506032b65700321006f060234ec1dcf08e4fedf8d0a52f9842cc7a96b79ed37f323cb2798264203cb"
        const Component = () => {
            const [state, dispatch] = useReducer();
            React.useEffect(
                () => {
                    dispatch({
                        type: "AuthenticationRequestReceived",
                        payload: {
                            loginHint: sampleLoginHint,
                        }
                    })
                },
                [],
            )
            return <>
                <span data-test-id="type">{state.type}</span>
                <span data-test-id="loginHint">{state.loginHint}</span>
            </>
            return <pre>{JSON.stringify(state)}</pre>
        }
        const el = mount(<Component />)
        expect(el.find('[data-test-id="type"]').text()).toContain('IdentityProviderState')
        expect(el.find('[data-test-id="loginHint"]').text()).toContain(sampleLoginHint)
    })
});
