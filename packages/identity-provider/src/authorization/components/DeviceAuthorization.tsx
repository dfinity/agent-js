import { DelegationChain, Ed25519KeyIdentity } from '@dfinity/authentication';
import Typography from '@material-ui/core/Typography';
import React, { Fragment, PropsWithoutRef } from 'react';
import { Button } from 'src/components/Button';
import { useAuth } from 'src/hooks/use-auth';

interface DeviceAuthorizationProps {
  onSuccess: () => void;
  onError?: (err: Error) => void;
  onRejection: () => void;
}

export default function DeviceAuthorization(props: PropsWithoutRef<DeviceAuthorizationProps>) {
  const auth = useAuth();

  async function handleCreateDeviceChain() {
    // create new Identity
    const deviceIdentity = Ed25519KeyIdentity.generate();
    // authorize from root Identity
    const from = auth.rootIdentity;
    const to = deviceIdentity.getPublicKey();
    const previous = auth.rootDelegationChain;
    if (!from) {
      return;
    }
    const chain = await DelegationChain.create(from, to, new Date(2099), { previous });
    auth.setDeviceIdentity(deviceIdentity);
    auth.setDeviceDelegationChain(chain);
    props.onSuccess();
  }

  return (
    <Fragment>
      <Typography variant='h4'>
        Do you want to authorize this device using your identity?
      </Typography>
      <Button onClick={props.onRejection}>Decline</Button>
      <Button color='primary' onClick={handleCreateDeviceChain}>
        Authorize Device
      </Button>
    </Fragment>
  );
}
