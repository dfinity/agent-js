import { Bip39Ed25519KeyIdentity } from '@dfinity/authentication';
import { Container, Snackbar, Typography } from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import { validateMnemonic, wordlists } from 'bip39';
import React, { createRef, FormEvent, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Alert } from 'src/components/Alert';
import { Button } from 'src/components/Button';
import { Mnemonic } from 'src/components/Mnemonic';
import { useAuth } from 'src/hooks/use-auth';

const englishWords = wordlists.english;

export function KeyImport() {
  const history = useHistory();
  const auth = useAuth();
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
    const fullMnemonic = texts.join(' ');
    const validated = validateMnemonic(fullMnemonic, englishWords);

    if (validated && auth) {
      const identity = Bip39Ed25519KeyIdentity.fromBip39Mnemonic(fullMnemonic, englishWords);
      auth.setRootId(identity);

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
    <Container maxWidth='lg'>
      <Typography variant='h2' align='center'>
        Import Existing Key
      </Typography>
      <Button variant='outlined' onClick={() => history.goBack()}>
        Back
      </Button>
      <form ref={_formRef} onSubmit={handleSubmit}>
        <Mnemonic wordList={wordList} mode="write" />
        <Button variant='outlined' color='secondary' startIcon={<SendIcon />} type='submit'>
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
}

export default KeyImport;
