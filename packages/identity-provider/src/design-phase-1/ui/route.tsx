import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Switch, useRouteMatch, useLocation, Redirect  } from 'react-router-dom';
import WelcomeScreen from './screens/WelcomeScreen';
import IdentityConfirmationScreen from './screens/IdentityConfirmationScreen';
import {default as SessionConsentScreen, AuthenticationResponseConsentProposal} from './screens/SessionConsentScreen';
import {default as AuthenticationResponseConfirmationScreen} from './screens/AuthenticationResponseConfirmationScreen';
import { SerializedStorage, IStorage, LocalStorageKey, NotFoundError } from '../state/state-storage';
import { useStateStorage } from '../state/state-storage-react';
import { StateToStringCodec } from '../state/state-serialization';
import { useState } from '../state/state-react';
import { hexToBytes, hexEncodeUintArray } from 'src/bytes';
import { Ed25519PublicKey , Ed25519KeyIdentity, DelegationChain} from '@dfinity/authentication';
import * as icid from "../../protocol/ic-id-protocol"
import { PublicKey, blobFromHex, derBlobFromBlob, SignIdentity, blobFromUint8Array } from '@dfinity/agent';
import tweetnacl from "tweetnacl";
import AuthenticationScreenLayout from './layout/AuthenticationScreenLayout';
import { ThemeProvider, Theme } from '@material-ui/core';
import { IdentityProviderStateType } from '../state/state';

const stateStorage = SerializedStorage(
    LocalStorageKey('design-phase-1'),
    StateToStringCodec(IdentityProviderStateType),
)

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
    const [state, dispatch] = useState(initialState)
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
    function onClickAuthenticationRequestReceived() {
        const sessionId = Ed25519KeyIdentity.generate();
        dispatch({
            type: "AuthenticationRequestReceived",
            payload: {
                type: "AuthenticationRequest",
                sessionIdentity: {
                    hex: hexEncodeUintArray(sessionId.getPublicKey().toDer()),
                },
                redirectUri: new URL('/relying-party-demo/oauth/redirect_uri', globalThis.location.href).toString(),
                scope: "canisterAPrincipalText canisterBPrincipalText",
            }
        });
    }
    const idpController = {
        /** Called when the end-user wants to create a brand new root identity. i.e. when they log in for first time */
        createProfile() {
            const profileSignIdentity = Ed25519KeyIdentity.generate()
            dispatch({
                type: "ProfileCreated",
                payload: {
                    publicKey: { hex: hexEncodeUintArray(new Uint8Array(profileSignIdentity.getPublicKey().toDer())) }
                }
            });
            dispatch({
                type: "DelegationRootSignerChanged",
                payload: {
                    secretKey: {
                        hex: hexEncodeUintArray(profileSignIdentity.getKeyPair().secretKey)
                    }
                }
            })
            dispatch({
                type: "Navigate",
                payload: {
                    href: urls.identity.confirmation
                }
            });
        },
        async createAuthenticationResponse(spec: {
            request: icid.AuthenticationRequest
            delegationTail: PublicKey,
        }): Promise<icid.AuthenticationResponse> {
            const signerSecretKeyHex = state.identities?.root?.sign?.secretKey.hex;
            if ( ! signerSecretKeyHex) {
                throw new Error("can't create DelegationChain without root signerSecretKeyHex")
            }
            const rootSignerKeyPair = tweetnacl.sign.keyPair.fromSecretKey(Uint8Array.from(hexToBytes(signerSecretKeyHex)))
            const rootSignIdentity: SignIdentity = Ed25519KeyIdentity.fromKeyPair(
                blobFromUint8Array(rootSignerKeyPair.publicKey),
                blobFromUint8Array(rootSignerKeyPair.secretKey),
            );
            const parsedScope = icid.parseScopeString(spec.request.scope)
            const response: icid.AuthenticationResponse = {
                type: "AuthenticationResponse",
                accessToken: icid.createBearerToken({
                    delegationChain: await DelegationChain.create(
                        rootSignIdentity,
                        spec.delegationTail,
                        new Date(Date.now() + Number(days(1))) /* 24hr expiry */,
                        {
                            targets: parsedScope.canisters.map(({principal}) => principal),
                        }
                    )
                }),
                expiresIn: 10000000,
                tokenType: "bearer",
            }
            return response;
        },
        async createResponseRedirectUrl(request: icid.AuthenticationRequest): Promise<URL> {
            const authResponse = await this.createAuthenticationResponse({
                request,
                delegationTail: {
                    toDer() {
                        return derBlobFromBlob(blobFromHex(request.sessionIdentity.hex))
                    }
                }
            });
            const oauth2Response = icid.toOAuth2(authResponse)
            const redirectUrl = new URL(request.redirectUri);
            for (const [key, value] of Object.entries(oauth2Response)) {
                redirectUrl.searchParams.set(key, value);
            }
            return redirectUrl
        },
        consentToAuthenticationResponseProposal: function consent (spec: {
            consentProposal: AuthenticationResponseConsentProposal,
            consenter: {
                publicKey: {
                    hex: string
                }
            }
        }) {
            const { consentProposal } = spec;
            console.debug('consentToAuthenticationResponseProposal', { consentProposal})
            dispatch({
                type: "AuthenticationRequestConsentReceived",
                payload: {
                    consent: {
                        type: "AuthenticationRequestConsent",
                        proposal: {
                            request: consentProposal.request,
                            attributedTo: spec.consenter
                        },
                        createdAt: { iso8601: (new Date).toISOString() },
                    }
                }
            });
        }
    }
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
    function MaybeTheme(props: { theme?: Theme, children: React.ReactNode }) {
        if ( ! props.theme) { return <>{props.children}</> }
        return <ThemeProvider theme={props.theme}>{props.children}</ThemeProvider>
    }
    const consentProposal: undefined|AuthenticationResponseConsentProposal = (state.identities.root.publicKey && state.authentication.request) && {
        profile: { id: state.identities.root.publicKey },
        session: {
            toDer() {
                const delegationTarget = state?.delegation?.target
                return delegationTarget ? Uint8Array.from(hexToBytes(delegationTarget.publicKey.hex)) : undefined
            }
        },
        scope: icid.parseScopeString(state.authentication.request.scope),
        request: state.authentication.request,
    };
    const rootIdentityPublicKey = state.identities.root.publicKey;
    return <><MaybeTheme theme={props.theme}>
        <AuthenticationScreenLayout>

            <Switch>
            <Route exact path={`${path}`}>
                <Redirect to={`${path}/welcome${location.search}`} />
            </Route>
            <Route exact path={`${path}/welcome`}>
                <WelcomeScreen
                    createProfile={idpController.createProfile}
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
                    ( ! rootIdentityPublicKey)
                        ? <>
                            No Profile Found. Please <a href="/">start over</a>
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
                        consent={() => idpController.consentToAuthenticationResponseProposal({
                            consentProposal,
                            consenter: {
                                publicKey: { hex: rootIdentityPublicKey.hex },
                            }
                        })}
                        /></>
                }
                </>
            }} />
            <Route exact path={urls.response.confirmation}>
                <AuthenticationResponseConfirmationScreen
                    redirectWithResponse={async () => {
                        const { authentication } = state;
                        const { request } = authentication
                        if ( ! request) {
                            throw new Error('authenticationRequest not set')
                        }
                        const responseRedirectUrl = await idpController.createResponseRedirectUrl(request)
                        globalThis.location.assign(responseRedirectUrl.toString())
                    }}
                />
            </Route>
            <NotFoundRoute />
        </Switch>
        </AuthenticationScreenLayout>


        <hr />
        <details open>
            <summary>debug tools</summary>
            <pre>{JSON.stringify(state, null, 2)}</pre>
            <button onClick={onClickAuthenticationRequestReceived}>AuthenticationRequestReceived</button>
            <button onClick={() => dispatch({ type: "reset" })}>reset state</button>
            <p>
                <a href={path}>start over</a>
            </p>
        </details>
    </MaybeTheme></>
}

/** return days since epoch as js Date object */
function days(count: number) {
    const msInOneDay = 1000 * 60 * 60 * 24
    return new Date(msInOneDay * count);
}
