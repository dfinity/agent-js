import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Switch, useRouteMatch, useLocation, Redirect  } from 'react-router-dom';
import WelcomeScreen from './screens/WelcomeScreen';
import IdentityConfirmationScreen from './screens/IdentityConfirmationScreen';
import SessionConsentScreen from './screens/SessionConsentScreen';
import AuthenticationResponseConfirmationScreen from './screens/AuthenticationResponseConfirmationScreen';
import { SerializedStorage, IStorage, LocalStorageKey, NotFoundError } from './state/state-storage';
import { useStateStorage } from './state/state-storage-react';
import { StateToStringCodec } from './state/state-serialization';
import { useState } from './state/state-react';
import { hexToBytes, hexEncodeUintArray } from 'src/bytes';
import { Ed25519PublicKey , Ed25519KeyIdentity, DelegationChain} from '@dfinity/authentication';
import * as icid from "../protocol/ic-id-protocol"
import { PublicKey, blobFromHex, derBlobFromBlob, SignIdentity, blobFromUint8Array } from '@dfinity/agent';
const stateStorage = SerializedStorage(
    LocalStorageKey('design-phase-1'),
    StateToStringCodec(),
)
import tweetnacl from "tweetnacl";

export default function DesignPhase0Route(props: {
    NotFoundRoute: React.ComponentType
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
            }
        });
    }
    const idpController = {
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
            const response: icid.AuthenticationResponse = {
                type: "AuthenticationResponse",
                accessToken: icid.createBearerToken({
                    delegationChain: await DelegationChain.create(
                        rootSignIdentity,
                        spec.delegationTail,
                    )
                }),
                expiresIn: 10000000,
                tokenType: "bearer",
            }
            return response;
        },
        async createResponseRedirectUrl(request: icid.AuthenticationRequest): Promise<URL> {
            const authResponse = await this.createAuthenticationResponse({
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
    return <>
        <div style={{minHeight: '100vh'}}>

        <Switch>
            <Route exact path={`${path}`}>
                <Redirect to={`${path}/welcome${location.search}`} />
            </Route>
            <Route exact path={`${path}/welcome`}>
                <WelcomeScreen
                    createProfile={idpController.createProfile}
                />
            </Route>
            <Route exact path={urls.identity.confirmation}>
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
            </Route>
            <Route exact path={urls.session.consent}>
                <SessionConsentScreen
                    next={urls.response.confirmation}
                    session={{
                        toDer() {
                            const delegationTarget = state?.delegation?.target
                            return delegationTarget ? Uint8Array.from(hexToBytes(delegationTarget.publicKey.hex)) : undefined
                        }
                    }}
                />
            </Route>
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
        </div>

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
    </>
}
