import { PublicKey } from '@dfinity/agent';
import {
  Bip39Ed25519KeyIdentity,
  DelegationChain,
  Ed25519KeyIdentity,
} from '@dfinity/authentication';
import { Typography } from '@material-ui/core';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import React, { Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'src/components/Button';
import { useAuth } from 'src/hooks/use-auth';
import KeyGeneration from 'src/key-mgmt/key-generation/routes/KeyGeneration';
import KeyImportContainer from 'src/key-mgmt/key-import/routes/KeyImport';
import { appendTokenParameter, getRequiredQueryParams } from 'src/identity-provider';
import { ICAuthenticationResponse } from 'types/responses';

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

  const [loginHint, setLoginHint] = React.useState<PublicKey>();
  const [redirectURI, setRedirectURI] = React.useState('');
  const [activeStep, setActiveStep] = React.useState(0);
  const [icAuthorizationResponse, setICAuthorizationResponse] = React.useState<
    ICAuthenticationResponse
  >();

  React.useEffect(() => {
    if (auth.sessionDelegationChain) {
      const accessToken = auth.sessionDelegationChain?.publicKey.toString() || '';
      const expiresIn =
        auth.sessionDelegationChain?.delegations[0].delegation.expiration.toNumber() || 1;
      const tokenType = 'bearer';
      setICAuthorizationResponse({
        accessToken,
        expiresIn,
        redirectURI,
        tokenType,
      });
    }
  }, [auth.sessionDelegationChain]);

  React.useEffect(() => {
    console.debug('new authorization response: ');
    console.debug(JSON.stringify(icAuthorizationResponse, null, 2));
  }, [icAuthorizationResponse]);
  React.useEffect(() => {
    try {
      const params = getRequiredQueryParams(location.search);
      setLoginHint(params.loginHint);
      setRedirectURI(params.redirectURI);
    } catch (error) {
      console.error(error);
    }
  }, [location.search]);

  React.useEffect(() => {
    if (loginHint) {
      auth.setSessionKey(loginHint);
    }
  }, [loginHint]);

  function handleGenerationSuccess(v: Bip39Ed25519KeyIdentity): void {
    if (auth) {
      auth.setRootIdentity(v);
    }
  }

  // skips the generate phase if we import
  function handleImportSuccess(v: Bip39Ed25519KeyIdentity): void {
    if (auth) {
      auth.setRootIdentity(v);
      setActiveStep(activeStep + 2);
    }
  }

  function handleRedirect() {
    if (redirectURI && auth.sessionDelegationChain && icAuthorizationResponse) {
      const query = new URLSearchParams();
      for (const key of Object.keys(icAuthorizationResponse)) {
        // if (ObjecticAuthorizationResponse)
      }
      const url = appendTokenParameter(redirectURI, auth.sessionDelegationChain.toJSON().publicKey);
      window.location.assign(url.href);
    }
  }

  function handleSessionKeyClick() {
    const key = Ed25519KeyIdentity.generate().getPublicKey();
    auth.setSessionKey(key);
    setLoginHint(key);
  }

  async function handleCreateRootChain() {
    const from = auth.rootIdentity;
    const to = auth.sessionKey;
    if (!from || !to) {
      return;
    }
    const chain = await DelegationChain.create(from, to, new Date(2099));
    auth.setRootDelegationChain(chain);
  }
  async function handleCreateSessionChain() {
    const from = auth.rootIdentity;
    const to = loginHint;
    const previous = auth.rootDelegationChain;
    if (!from || !to) {
      console.error('no from or to found: ', { from, to });
    } else {
      const options = {
        previous,
      };
      const tomorrow = new Date(Date.now() + 15 * 60 * 1000);
      const sessionChain = await DelegationChain.create(from, to, tomorrow, options);
      auth.setSessionDelegationChain(sessionChain);
    }
  }

  const steps: Array<{ label: string; component: JSX.Element }> = [
    {
      label: 'Check whether or not the user has an existing Root Delegation Key',
      component: (
        <div key='Check whether or not the user has an existing Root Delegation Key'>
          <Typography variant='h4'>
            Root Delegation Key: {auth.rootDelegationChain || 'none found'}
          </Typography>
          {!auth.rootDelegationChain && (
            <Button color='default' variant='contained' onClick={handleNext}>
              Next
            </Button>
          )}
        </div>
      ),
    },
    {
      label: 'If not, offer to import a Root Identity [optional]',
      component: (
        <KeyImportContainer
          key='If not, offer to either generate or import a Root Identity'
          onSkip={handleNext}
          onSuccess={handleImportSuccess}
        />
      ),
    },
    {
      label: 'If not, offer to generate a Root Identity',
      component: (
        <Fragment>
          {auth.rootIdentity && 'Root Key: ' + JSON.stringify(auth.rootIdentity.getKeyPair())}
          <KeyGeneration
            key='If not, offer to generate a Root Identity'
            onBack={handlePrevious}
            onSuccess={handleGenerationSuccess}
          />
        </Fragment>
      ),
    },
    {
      label: 'Use the `login_hint` query parameter to create the Session Ed25519KeyIdentity',
      component: (
        <div>
          <Typography variant='h4'>
            Login Hint: {(loginHint && JSON.stringify(loginHint)) || 'none found in query string'}
          </Typography>
          <Button onClick={handleSessionKeyClick}>
            Generate Random Session Identity (no login hint)
          </Button>
        </div>
      ),
    },
    {
      label: `Ask the end-user's consent to delegate from their rootDelegationChain to this RP's sessionIdentity (If no, redirect back with error per oauth2).`,
      component: (
        <div>
          <Typography variant='h4'>Do you consent to creating a root Delegation Chain?</Typography>
          <Typography variant='h4'>
            Root Chain:{' '}
            {auth.rootDelegationChain && JSON.stringify(auth.rootDelegationChain.toJSON())}
          </Typography>
          <Button onClick={handleCreateRootChain}>Create Root Chain</Button>
        </div>
      ),
    },
    {
      label: 'Build a new sessionDelegationChain = rootDelegationChain + sessionKeyIdentity',
      component: (
        <div>
          <Typography variant='h4'>
            Do you consent to creating a session Delegation Chain?
          </Typography>
          <Typography variant='h4'>
            Session Chain:{' '}
            {auth.sessionDelegationChain && JSON.stringify(auth.sessionDelegationChain.toJSON())}
          </Typography>
          <Button onClick={handleCreateSessionChain}>Create Root Chain</Button>
        </div>
      ),
    },
    {
      label: 'Use that to build an AuthenticationResponse',
      component: (
        <div>
          <Typography variant='h4'>
            Authorization Request Preview: {JSON.stringify(icAuthorizationResponse)}
          </Typography>
        </div>
      ),
    },
    {
      label:
        'Redirect back to RP redirect_uri with AuthenticationResponse (as query params, see oauth)',
      component: (
        <div>
          <Button onClick={handleRedirect}>Redirect</Button>
        </div>
      ),
    },
  ];

  function handleReset() {
    setActiveStep(0);
  }

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
        {steps.map(({ label }) => {
          const stepProps: { completed?: boolean } = {};
          const labelProps: { optional?: React.ReactNode } = {};
          return (
            <Step key={label} {...stepProps}>
              <StepLabel {...labelProps}>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      {activeStep === steps.length ? (
        <div>
          <Typography>All steps completed - you&apos;re finished</Typography>
          <Button onClick={handleReset}>Reset</Button>
        </div>
      ) : (
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
      )}
    </Fragment>
  );
}

export default AuthorizationRoute;
