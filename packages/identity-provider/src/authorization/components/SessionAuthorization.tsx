import { PublicKey } from '@dfinity/agent';
import { DelegationChain, Ed25519KeyIdentity } from '@dfinity/authentication';
import { Typography } from '@material-ui/core';
import React, { Fragment, PropsWithoutRef, useEffect } from 'react';
import { Button } from 'src/components/Button';
import { useAuth } from 'src/hooks/use-auth';
import { getRequiredQueryParams } from 'src/identity-provider';

interface SessionAuthorizationProps {
  onSuccess: () => void;
  onError?: (err: Error) => void;
  onRejection: () => void;
}

export default function SessionAuthorization(props: PropsWithoutRef<SessionAuthorizationProps>) {
  const auth = useAuth();
  const [loginHint, setLoginHint] = React.useState<PublicKey>();
  // every time our query parameters change, we should try to get login hint and redirect from them
  useEffect(() => {
    try {
      const params = getRequiredQueryParams(location.search);
      setLoginHint(params.loginHint);
    } catch (error) {
      console.error(error);
    }
  }, [location.search]);

  useEffect(() => {
    if (auth.sessionDelegationChain !== undefined) {
      props.onSuccess();
    }
  }, [auth.sessionDelegationChain]);

  async function handleCreateSessionChain() {
    const from = auth.deviceIdentity;
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

  return (
    <Fragment>
      <Typography variant='h4'>Do you want to authorize this app using your identity?</Typography>
      <Button onClick={props.onRejection}>Decline</Button>
      <Button color='primary' onClick={handleCreateSessionChain}>
        Authorize Session
      </Button>
    </Fragment>
  );
}
