import { blobFromUint8Array, Identity, Principal } from '@dfinity/agent';
import { Bip39Ed25519KeyIdentity, Ed25519KeyIdentity } from '@dfinity/authentication';
import {
  Container,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Snackbar,
} from '@material-ui/core';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'src/components/Button';
import { Mnemonic } from 'src/components/Mnemonic';
import { Modal } from 'src/components/Modal';
import { Alert } from 'src/components/Alert';

export const KeyGeneration = () => {
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [hasMnemonic, setHasMnemonic] = useState<boolean>(false);
  const [keypair, setKeyPair] = useState<Bip39Ed25519KeyIdentity>();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSnackError, setShowSnackError] = useState(false);

  function generateMnemonic() {
    const bip = Bip39Ed25519KeyIdentity.generate();
    const newMnemonic = bip.getBip39Mnemonic();
    setKeyPair(bip);
    setMnemonic(newMnemonic.split(' '));
    setHasMnemonic(true);
  }
  function handleSubmit(formEl: HTMLFormElement) {
    const rawInputEls = formEl.querySelectorAll<HTMLInputElement>('input[type="text"]');
    const texts = Array.from(rawInputEls).map(ch => ch?.value);
    const valid = texts.join(' ') === mnemonic.join(' ');
    if (valid) {
      setShowConfirmModal(false);
    } else {
      setShowSnackError(true);
    }
    // @TODO what to do with actual keypair?
  }

  const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setShowSnackError(false);
  };

  const history = useHistory();
  return (
    <Container>
      <Typography variant={'h2'}>Generate New Key</Typography>

      <Snackbar open={showSnackError} autoHideDuration={4000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="error">
          One or more words in mnemonic list is malformed
        </Alert>
      </Snackbar>
      <Button variant={'outlined'} onClick={() => history.goBack()}>
        Back
      </Button>
      <Button color="primary" onClick={generateMnemonic}>
        Generate Master Key
      </Button>
      {hasMnemonic ? <Mnemonic wordList={mnemonic} mode="read" /> : null}
      {hasMnemonic ? (
        <Button
          hidden={!hasMnemonic}
          color={'secondary'}
          variant={'contained'}
          onClick={() => setShowConfirmModal(true)}
        >
          Continue
        </Button>
      ) : null}

      <Modal
        fullWidth={true}
        maxWidth={'lg'}
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
      >
        <DialogTitle>Confirm your Mnemonic</DialogTitle>

        <DialogContent>
          <Mnemonic wordList={mnemonic} mode="write" onSubmit={handleSubmit} />
        </DialogContent>
      </Modal>
    </Container>
  );
};

export default KeyGeneration;
