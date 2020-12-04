import { DelegationChain, Ed25519KeyIdentity } from '@dfinity/authentication';
import Typography from '@material-ui/core/Typography';
import React, { Fragment, PropsWithoutRef } from 'react';
import { Button } from 'src/components/Button';
import { useAuth } from 'src/hooks/use-auth';

interface RootDelegationChainCreationProps {
  onSuccess: () => void;
  onError?: (err: Error) => void;
  onRejection: () => void;
}

export default function RootDelegationChainCreation(
  props: PropsWithoutRef<RootDelegationChainCreationProps>,
) {
  const auth = useAuth();

  async function handleCreateRootChain() {
    const from = auth.rootIdentity;
    const to = Ed25519KeyIdentity.generate().getPublicKey();
    if (!from || !to) {
      if (props.onError) {
        props.onError(new Error('from or to does not exist'));
      } else {
        throw new Error('from or to does not exist');
      }
    } else {
      const chain = await DelegationChain.create(from, to, new Date(2099));
      auth.setRootDelegationChain(chain);
      props.onSuccess();
    }
  }
  return (
    <Fragment>
      <Typography variant='h4'>Do you consent to creating a root Delegation Chain?</Typography>
      <Button onClick={props.onRejection}>Decline</Button>
      <Button color='primary' onClick={handleCreateRootChain}>
        Create Root Chain
      </Button>
    </Fragment>
  );
}
