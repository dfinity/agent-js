import { PublicKey, blobFromHex } from '@dfinity/agent';
import {
  Bip39Ed25519KeyIdentity,
  DelegationChain,
  Ed25519KeyIdentity,
  Ed25519PublicKey,
} from '@dfinity/authentication';
import Typography from '@material-ui/core/Typography';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import React, { Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'src/components/Button';
import { useAuth } from 'src/hooks/use-auth';
import KeyGeneration from 'src/authorization/components/KeyGeneration';
import KeyImportContainer from 'src/authorization/components/KeyImport';
import { getRequiredQueryParams } from 'src/identity-provider';
import RootDelegationChainCreation from 'src/authorization/components/RootDelegationChainCreation';
import DeviceAuthorization from 'src/authorization/components/DeviceAuthorization';
import SessionAuthorization from 'src/authorization/components/SessionAuthorization';
import * as icid from '../../protocol/ic-id-protocol';

/**
 * This component is responsible for handling the top-level authentication flow.
 * What should it do? (happy path, assuming consent at each stage)
 *    1. Check whether or not the user has an existing Root Delegation Key
 *    2. If not, offer to either generate or import a Root Identity
 *    3. Create a Root Delegation based on the now-definitely-existing Root Identity
 *    4. Use the `login_hint` query parameter to create the Session Ed25519KeyIdentity
 *    5. Ask the end-user's consent to delegate from their rootDelegationChain to this
 *       RP's sessionIdentity (If no, redirect back with error per oauth2).
 *    6. Build a new sessionDelegationChain = rootDelegationChain + sessionKeyIdentity
 *    7. Use that to build an AuthenticationResponse
 *    8. (debugging: log or render the AuthenticationResponse?)
 *    9. Redirect back to RP redirect_uri with AuthenticationResponse (as query params, see oauth)
 */
export function AuthorizationRoute() {
  const auth = useAuth();
  const location = useLocation();
  const [authenticationRequest, setAuthenticationRequest] = React.useState<icid.IDPAuthenticationRequest>()
  const [activeStep, setActiveStep] = React.useState(0);

  // Redirect to relying party with proper query parameters
  function handleRedirect() {
    if (auth && auth.sessionDelegationChain && authenticationRequest) {
      // @TODO(bengo) - make this a hex(cborEncode(ICAuthenticationResponse))
      // where ICAuthenticationResponse({ sender_delegation, ... })
      const accessToken = icid.createBearerToken({ delegationChain: auth.sessionDelegationChain });
      const expiresIn =
        auth.sessionDelegationChain?.delegations[0].delegation.expiration.toNumber() || 1;
      const tokenType = 'bearer';
      const icAuthResponse: icid.ICAuthenticationResponse = {
        accessToken,
        expiresIn,
        tokenType,
        ...(authenticationRequest?.state && {
          state: authenticationRequest.state,
        }),
      };
      const oauth2AcessTokenResponse = icid.toOAuth2(icAuthResponse);

      console.debug('new AccessTokenResponse: ', JSON.stringify(oauth2AcessTokenResponse, null, 2));

      const finalRedirectUri = (() => {
        const _finalRedirectUri = new URL(authenticationRequest.redirectUri.toString());
        for (const [key, value] of Object.entries(oauth2AcessTokenResponse)) {
          _finalRedirectUri.searchParams.set(key, value);
        }
        return _finalRedirectUri;
      })();
      window.location.assign(finalRedirectUri.toString());
    }
  }

  // every time our query parameters change, we should try to get login hint and redirect from them
  React.useEffect(
    () => {
      const searchParams = new URLSearchParams(location.search);
      const redirectUriString = searchParams.get('redirect_uri');
      const redirectUri = redirectUriString && new URL(redirectUriString)
      const loginHintString = searchParams.get('login_hint');
      const sessionIdentity = loginHintString && Ed25519PublicKey.fromDer(blobFromHex(loginHintString))
      const state = searchParams.get('state');
      if (redirectUri && sessionIdentity) {
        const authenticationRequest: icid.IDPAuthenticationRequest = {
          redirectUri,
          sessionIdentity,
          ...(state && { state }),
        }
        setAuthenticationRequest(authenticationRequest)
      } else {
        setAuthenticationRequest(undefined);
      }
    },
    [location.search]
  )

  React.useEffect(() => {
    if (auth.rootIdentity) {
      // if root identity, then check root chain
      if (auth.rootDelegationChain) {
        // if they have a root chain, that means this device is already authorized
        // continue to authorize session
        setActiveStep(STEPS.SESSION_AUTHORIZATION);
      } else {
        // they've just imported or created, so let's prompt for device authorization
        // @TODO create new delegation chain
        setActiveStep(STEPS.DEVICE_AUTHORIATION);
      }
    }
  }, [auth.rootIdentity]);

  function handleDecline() {
    // handle declining authorization at any step
    // @todo(andrew): handle different scenarios with different descriptions
    if ( ! authenticationRequest) {
      console.warn('handleDecline called without an authenticationRequest. Returning early.')
      return;
    }
    const redirect = new URL(authenticationRequest.redirectUri.toString());
    redirect.searchParams.append('error', 'access_denied');
    redirect.searchParams.append('error_description', 'User denied authorization');
    window.location.assign(redirect.href);
  }

  interface CustomStep {
    label: string;
    component: JSX.Element;
    optional?: boolean;
  }

  // this is directly tied to `steps`, but a way to be a little more explicit!
  enum STEPS {
    IMPORT = 0,
    GENERATE = 1,
    ROOT_DELEGATION = 2,
    DEVICE_AUTHORIATION = 3,
    SESSION_AUTHORIZATION = 4,
  }

  const steps: CustomStep[] = [
    {
      label: 'Import a Root Identity?',
      component: (
        <KeyImportContainer
          onSkip={handleNext}
          onSuccess={() => setActiveStep(STEPS.ROOT_DELEGATION)}
        />
      ),
      optional: true,
    },
    {
      label: 'Generate new Root Identity',
      component: <KeyGeneration key='Key Generation' onSuccess={handleNext} />,
    },
    {
      label: `Create Root Delegation Chain`,
      component: <RootDelegationChainCreation onRejection={handleDecline} onSuccess={handleNext} />,
    },
    {
      label: `Authorize Device`,
      component: <DeviceAuthorization onRejection={handleDecline} onSuccess={handleNext} />,
    },
    {
      label: 'Authorize Session',
      component: <SessionAuthorization onRejection={handleDecline} onSuccess={handleRedirect} />,
    },
  ];

  function handleNext() {
    setActiveStep(activeStep + 1);
  }

  function handlePrevious() {
    setActiveStep(activeStep - 1);
  }

  return (
    <Fragment>
      <Typography variant='h2' style={{ textAlign: 'center' }}>
        Identity Provider
      </Typography>
      <Stepper activeStep={activeStep}>
        {steps.map(({ label, optional }) => {
          const stepProps: { completed?: boolean } = {};
          const labelProps: { optional?: React.ReactNode } = {};
          if (optional) {
            labelProps.optional = <Typography variant='caption'>Optional</Typography>;
          }
          return (
            <Step key={label} {...stepProps}>
              <StepLabel {...labelProps}>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      <div>
        <div>
          <Button disabled={activeStep === 0} onClick={handlePrevious}>
            Back
          </Button>
          <Button disabled={activeStep === steps.length - 1} onClick={handleNext}>
            Next
          </Button>
        </div>
        {steps[activeStep].component}
      </div>
    </Fragment>
  );
}

export default AuthorizationRoute;
