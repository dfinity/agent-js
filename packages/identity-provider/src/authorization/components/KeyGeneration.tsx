import { Bip39Ed25519KeyIdentity } from '@dfinity/authentication';
import Container from '@material-ui/core/Container';
import Snackbar from '@material-ui/core/Snackbar';
import Typography from '@material-ui/core/Typography';
import React, { createRef, FormEvent, PropsWithoutRef, useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Alert } from 'src/components/Alert';
import { Button } from 'src/components/Button';
import { Mnemonic } from 'src/components/Mnemonic';
import { useAuth } from 'src/hooks/use-auth';
import { ROUTES } from 'src/utils/constants';

interface KeyGenProps {
  onSuccess: () => void;
}

/**
 * This component is to be used when the user has indicated that they want to create a new
 *    Root Identity.
 * It awaits a click on the "Create" button and will display a grid representing the BIP39
 *    mnemonic generated from entropy via `Bip39Ed25519KeyIdentity`.
 * Similar to `KeyImort.tsx`, this component will update the shared context state (via `useAuth`)
 *    with the new identity that was generated.
 *
 */
export function KeyGeneration(props: PropsWithoutRef<KeyGenProps>) {
  const { onSuccess } = props;
  const auth = useAuth();
  const history = useHistory();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [masterIdentity, setMasterIdentity] = useState<Bip39Ed25519KeyIdentity>();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [snackError, setSnackError] = useState<Error>();
  const _formRef = createRef<HTMLFormElement>();

  function generateMnemonic() {
    const bip = Bip39Ed25519KeyIdentity.generate();
    if (auth) {
      auth.setRootIdentity(bip);
    }
    onSuccess();
  }

  const handleSubmit = useCallback(
    function _handleSubmit(ev: FormEvent): void {
      ev.preventDefault();
      const formEl = _formRef.current;
      if (formEl) {
        const rawInputEls = formEl.querySelectorAll<HTMLInputElement>('input[type="text"]');
        const texts = Array.from(rawInputEls).map(ch => ch?.value);
        const valid = texts.join(' ') === mnemonic.join(' ');
        if (valid && masterIdentity) {
          setShowConfirmModal(false);
          auth?.setRootIdentity(masterIdentity);
          history.push(ROUTES.AUTHORIZATION);
        } else {
          setSnackError(Error('mnemonics do not match'));
        }
      }
    },
    [_formRef, masterIdentity],
  );

  const handleClose = useCallback(function _handleClose(
    _?: React.SyntheticEvent,
    reason?: string,
  ): void {
    if (reason === 'clickaway') {
      return;
    }
    setSnackError(undefined);
  },
  []);
  const hasMnemonic = mnemonic.length === 24;
  return (
    <Container>
      <Typography variant='body1'>
        It looks like we don't have an identity for you. Would you like to generate one?
      </Typography>
      <Snackbar open={snackError !== undefined} autoHideDuration={4000}>
        <Alert onClose={handleClose} severity='error'>
          Error encountered: {snackError?.message}
        </Alert>
      </Snackbar>
      <Button color='primary' onClick={generateMnemonic}>
        Generate Master Key
      </Button>
      <Mnemonic wordList={mnemonic} mode='read' />
    </Container>
  );
}

export default KeyGeneration;
