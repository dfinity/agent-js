import { Bip39Ed25519KeyIdentity } from '@dfinity/authentication';
import * as bip39 from 'bip39';
import { Container, Snackbar, Typography } from '@material-ui/core';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'src/components/Button';
import { Mnemonic } from 'src/components/Mnemonic';
import { Alert } from 'src/components/Alert';

const englishWords = bip39.wordlists.english;

export const KeyImport = () => {
  const history = useHistory();
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);

  const wordList = [];
  for (let i = 0; i < 24; i++) {
    wordList.push('');
  }

  function handleSubmit(formEl: HTMLFormElement): void {
    const rawInputEls = formEl.querySelectorAll<HTMLInputElement>('input[type="text"]');
    const texts = Array.from(rawInputEls).map(ch => ch?.value);
    const validated = bip39.validateMnemonic(texts.join(' '), englishWords);

    if (validated) {
      alert('GOOD JOB');
      const keypair = Bip39Ed25519KeyIdentity.fromBip39Mnemonic(texts.join(' '), englishWords);
      const { publicKey, secretKey } = keypair.getKeyPair();
      alert(JSON.stringify({ publicKey, secretKey }));
      // @TODO: do something with the validated mnemonic
    } else {
      setOpen(true);
    }
  }

  const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setOpen(false);
  };

  return (
    <Container maxWidth={'lg'}>
      <Typography variant={'h2'} align={'center'}>
        Import Existing Key
      </Typography>
      <Button variant={'outlined'} onClick={() => history.goBack()}>
        Back
      </Button>
      <Mnemonic wordList={wordList} mode="write" onSubmit={handleSubmit} />
      <Snackbar open={open} autoHideDuration={4000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="error">
          One or more words in mnemonic list is malformed
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default KeyImport;
