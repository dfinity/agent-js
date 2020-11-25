import { Bip39Ed25519KeyIdentity } from '@dfinity/authentication';
import { Container, Snackbar, Typography } from '@material-ui/core';
import React, { createRef, FormEvent, Fragment, useCallback, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { Alert } from 'src/components/Alert';
import { Button } from 'src/components/Button';
import { Mnemonic } from 'src/components/Mnemonic';
import { useAuth } from 'src/hooks/use-auth';
import { ROUTES } from 'src/utils/constants';
import { KeyGenModal } from '../components/KeyGenModal';

/**
 * This component is to be used when the user has indicated that they want to create a new
 *    Root Identity.
 * It awaits a click on the "Create" button and will display a grid representing the BIP39
 *    mnemonic generated from entropy via `Bip39Ed25519KeyIdentity`.
 * Similar to `KeyImort.tsx`, this component will update the shared context state (via `useAuth`)
 *    with the new identity that was generated.
 *
 */
export function KeyGeneration() {
  const auth = useAuth();
  const history = useHistory();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [hasMnemonic, setHasMnemonic] = useState<boolean>(false);
  const [masterIdentity, setMasterIdentity] = useState<Bip39Ed25519KeyIdentity>();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [snackError, setSnackError] = useState<Error>();
  const _formRef = createRef<HTMLFormElement>();

  function generateMnemonic() {
    const bip = Bip39Ed25519KeyIdentity.generate();
    const newMnemonic = bip.getBip39Mnemonic();
    setMasterIdentity(bip);
    setMnemonic(newMnemonic.split(' '));
    setHasMnemonic(true);
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
          history.push(ROUTES.LOGIN);
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
  return (
    <Container>
      <Typography variant='h2'>Generate New Key</Typography>

      <Snackbar open={snackError !== undefined} autoHideDuration={4000}>
        <Alert onClose={handleClose} severity='error'>
          Error encountered: {snackError?.message}
        </Alert>
      </Snackbar>
      <Button variant='outlined'>
        <Link to={ROUTES.LOGIN}>Back</Link>
      </Button>
      <Button color='primary' onClick={generateMnemonic}>
        Generate Master Key
      </Button>
      {hasMnemonic ? (
        <Fragment>
          <Mnemonic wordList={mnemonic} mode='read' />
          <Button
            hidden={!hasMnemonic}
            color='secondary'
            variant='contained'
            onClick={() => setShowConfirmModal(true)}
          >
            Continue
          </Button>
        </Fragment>
      ) : null}

      <KeyGenModal
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        _formRef={_formRef}
        handleSubmit={handleSubmit}
        mnemonic={mnemonic}
      />
    </Container>
  );
}

export default KeyGeneration;
