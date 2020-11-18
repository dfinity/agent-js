import { Bip39Ed25519KeyIdentity } from '@dfinity/authentication';
import * as bip39 from 'bip39';
import { Container, Snackbar, Typography } from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import React, { createRef, FormEvent, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'src/components/Button';
import { Mnemonic } from 'src/components/Mnemonic';
import { Alert } from 'src/components/Alert';

const englishWords = bip39.wordlists.english;

export const KeyImport = () => {
  const history = useHistory();
  const [snackError, setSnackError] = useState<Error>();
  const _formRef = createRef<HTMLFormElement>();
  const wordList = [];
  for (let i = 0; i < 24; i++) {
    wordList.push('');
  }

  function handleSubmit(ev: FormEvent): void {
    ev.preventDefault();
    const formEl = _formRef.current!;
    const rawInputEls = formEl.querySelectorAll<HTMLInputElement>('input[type="text"]');
    const texts = Array.from(rawInputEls).map(ch => ch?.value);
    const validated = bip39.validateMnemonic(texts.join(' '), englishWords);

    if (validated) {
      const keypair = Bip39Ed25519KeyIdentity.fromBip39Mnemonic(texts.join(' '), englishWords);
      const { publicKey, secretKey } = keypair.getKeyPair();
      alert(JSON.stringify({ publicKey, secretKey }));
      // @TODO: do something with the validated mnemonic
    } else {
      setSnackError(Error(' One or more words in mnemonic list is malformed'));
    }
  }

  const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackError(undefined);
  };

  return (
    <Container maxWidth={'lg'}>
      <Typography variant={'h2'} align={'center'}>
        Import Existing Key
      </Typography>
      <Button variant={'outlined'} onClick={() => history.goBack()}>
        Back
      </Button>
      <form ref={_formRef} onSubmit={handleSubmit}>
        <Mnemonic wordList={wordList} mode="write" />
        <Button variant={'outlined'} color={'secondary'} startIcon={<SendIcon />} type={'submit'}>
          Import
        </Button>
      </form>
      <Snackbar open={snackError !== undefined}>
        <Alert onClose={handleClose} severity="error">
          Error encountered: {snackError?.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default KeyImport;
