import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Switch, useRouteMatch, useLocation, Redirect, useHistory  } from 'react-router-dom';
import WelcomeScreen from './screens/WelcomeScreen';
import IdentityConfirmationScreen from './screens/IdentityConfirmationScreen';
import {default as SessionConsentScreen} from './screens/SessionConsentScreen';
import {default as AuthenticationResponseConfirmationScreen} from './screens/AuthenticationResponseConfirmationScreen';
import { SerializedStorage, IStorage, LocalStorageKey, NotFoundError } from '../state/state-storage';
import { useStateStorage } from '../state/state-storage-react';
import { StateToStringCodec } from '../state/state-serialization';
import { hexToBytes, hexEncodeUintArray } from 'src/bytes';
import { Ed25519PublicKey , Ed25519KeyIdentity, DelegationChain, WebAuthnIdentity} from '@dfinity/authentication';
import * as icid from "../../protocol/ic-id-protocol"
import { PublicKey, blobFromHex, derBlobFromBlob, SignIdentity, blobFromUint8Array } from '@dfinity/agent';
import tweetnacl from "tweetnacl";
import AuthenticationScreenLayout from './layout/AuthenticationScreenLayout';
import { ThemeProvider, Theme } from '@material-ui/core';
import { IdentityProviderStateType } from '../state/state';
import IdentityProviderReducer, * as reducer from "../state/reducer";

const stateStorage = SerializedStorage(
    LocalStorageKey('design-phase-1'),
    StateToStringCodec(IdentityProviderStateType),
)
import AuthenticationController from '../AuthenticationController';
import { AuthenticationResponseConsentProposal, createSignIdentity } from '../state/reducers/authentication';
import { useReducer } from '../state/state-react';

function StubbedWebAuthn() {
    return {
        async create() {
            return WebAuthnIdentity.fromJSON(JSON.stringify({
                publicKey: hexEncodeUintArray(Uint8Array.from([])),
                rawId: hexEncodeUintArray(Uint8Array.from([])),
              }));
        }
    }
}

export default function DesignPhase0Route(props: {
    NotFoundRoute: React.ComponentType
    theme?: Theme
}) {
    const NotFoundRoute = props.NotFoundRoute;
    const location = useLocation()
    const { url, path } = useRouteMatch()
    const initialState = React.useMemo(
        () => {
            try {
                const initialStateFromStorage = stateStorage.get();
                return initialStateFromStorage;
            } catch (error) {
                if (error instanceof NotFoundError) {
                    console.debug('Nothing in StateStorage. This must be the first time');
                    return;
                }
                throw error;
            }
        },
        [stateStorage],
    )
    const history = useHistory();
    const [state, dispatch] = useReducer(IdentityProviderReducer({
        WebAuthn: StubbedWebAuthn(),
        history,
    }), initialState)
    useStateStorage(stateStorage, state, dispatch);
    const urls = {
        identity: {
            confirmation: `${path}/identity/confirmation`,
        },
        session: {
            consent: `${path}/session/consent`,
        },
        response: {
            confirmation: `${path}/response/confirmation`,
        }
    };
    const rootIdentity = React.useMemo(
      () => {
        if ( ! state.identities.root.sign) { return; }
        return createSignIdentity(state.identities.root.sign.signer)
      },
      [state.identities.root.sign],
    )
    const authenticationController = AuthenticationController({ urls });
    /**
     * Whenever there is a new location.search on this page, it might be an oauth2 AuthenticaitonRequest.
     * For each new value of location.search, try to parse it as an AuthenticationRequest.
     * If successful, dispatch AuthenticationRequestReceived so all state is updated for the new request.
     */
    React.useEffect(
        () => {
            const searchParams = new URLSearchParams(location.search);
            const icidMessage = icid.fromQueryString(searchParams)
            if ( ! icidMessage) return;
            if (icidMessage.type === "AuthenticationRequest") {
                dispatch({
                    type: "AuthenticationRequestReceived",
                    payload: icidMessage,
                })
            }

        },
        [location.search]
    )
    const consentProposal: undefined|AuthenticationResponseConsentProposal = (state.identities.root.sign && state.authentication.request) && {
        signer: state.identities.root.sign.signer,
        request: state.authentication.request,
    };
    const rootIdentitySigner = state.identities.root.sign?.signer
    const rootSignIdentity = React.useMemo(
        () => rootIdentitySigner && createSignIdentity(rootIdentitySigner),
        [rootIdentitySigner]
    )
    return <><MaybeTheme theme={props.theme}>
        <AuthenticationScreenLayout>

            <Switch>
            <Route exact path={`${path}`}>
                <Redirect to={`${path}/welcome${location.search}`} />
            </Route>
            <Route exact path={`${path}/welcome`}>
                <WelcomeScreen
                    identity={rootSignIdentity}
                    useIdentity={async (identity) => {
                        for (const effect of (await authenticationController.useIdentityAndConfirm({identity}))) {
                            dispatch(effect);
                        }
                    }}
                    createProfile={async () => {
                        const identity = await WebAuthnIdentity.create();
                        for (const effect of (await authenticationController.useIdentityAndConfirm({identity}))) {
                            dispatch(effect);
                        }
                    }}
                />
            </Route>
            <Route exact path={urls.identity.confirmation} component={() => {
                return <>
                    <IdentityConfirmationScreen
                        next={urls.session.consent}
                        identity={state?.identities?.root?.publicKey
                            ?
                            {
                                toDer() {
                                    const publicKeyHex = state?.identities?.root?.publicKey?.hex
                                    const publicKey = publicKeyHex && Uint8Array.from(hexToBytes(publicKeyHex))
                                    return publicKey || Uint8Array.from([])
                                }
                            }
                            : undefined
                        }
                    />
                </>
            }} />
            <Route exact path={urls.session.consent} component={() => {
                const authenticationRequestHasConsent = React.useMemo(
                    () => {
                        const {request, consent} = state.authentication;
                        if ( ! consent) return false;
                        return JSON.stringify(request) === JSON.stringify(consent.proposal.request);
                    },
                    [state.authentication],
                );
                /** If the we've already consented to this request, redirect to next screen. */
                if (authenticationRequestHasConsent) {
                    return <Redirect to={urls.response.confirmation} />
                }
                return <>
                {
                    ( ! rootIdentity)
                        ? <>
                            No rootIdentity Found. Please <a href="/">start over</a>
                        </>
                    : ( ! state.authentication.request)
                        ? <>
                            No AuthenticationRequest Found. Please <a href="/">start over</a>
                        </>
                    : ( ! consentProposal)
                        ? <>
                            No consentProposal Found. Please <a href="/">start over</a>
                        </>
                    :   <><SessionConsentScreen
                        consentProposal={consentProposal}
                        consent={async () => {
                            for (const action1 of await authenticationController.consentToAuthenticationResponseProposal({
                                consentProposal,
                                consenter: rootIdentity
                            })) {
                                dispatch(action1);
                            }
                        }}
                        /></>
                }
                </>
            }} />
            <Route exact path={urls.response.confirmation}>
                {
                (! rootIdentity)
                ? <>
                  No session found. Please <a href="/">start over</a>
                  </>
                : (!state.authentication.request)
                ? <>
                  No AuthenticationRequest found. Please <a href="/">start over</a>
                  </>
                : (!state.authentication.response)
                ? <>
                No AuthenticationResponse found. Please <a href="/">start over</a>
                </>
                : <>
                <AuthenticationResponseConfirmationScreen
                    request={state.authentication.request}
                    response={state.authentication.response}
                    redirectWithResponse={async ({request, response}) => {
                        for (const action of await authenticationController.respond({
                            request,
                            response,
                        })) {
                          dispatch(action);
                        }
                    }}
                />
                  </>
                }
            </Route>
            <NotFoundRoute />
        </Switch>
        </AuthenticationScreenLayout>


        <hr />
        <details open>
            <summary>debug tools</summary>
            <pre>{JSON.stringify(state, null, 2)}</pre>
            <button onClick={() => dispatch({ type: "reset" })}>reset state</button>
            <p>
                <a href={`${path}/../`}>start over</a>
            </p>
        </details>
    </MaybeTheme></>
}

/**
 * Wrap children in a material-ui ThemeProvider if a theme prop is provided,
 * otherwise just render children.
 */
function MaybeTheme(props: { theme?: Theme, children: React.ReactNode }) {
  if ( ! props.theme) { return <>{props.children}</> }
  return <ThemeProvider theme={props.theme}>{props.children}</ThemeProvider>
}