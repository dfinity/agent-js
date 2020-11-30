import { Bip39Ed25519KeyIdentity } from '@dfinity/authentication';
import { Container, Typography } from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import { validateMnemonic, wordlists } from 'bip39';
import React, { createRef, FormEvent, PropsWithoutRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'src/components/Button';
import { Mnemonic } from 'src/components/Mnemonic';
import { useAuth } from 'src/hooks/use-auth';
import { KeyImportSnackbar } from './KeyImportSnackbar';

const englishWords = wordlists.english;

/**
 * This component is used when the user has indicated that they want to import their own root key
 * It provides a grid of input elements into which the user must enter their BIP39 mnemonic.
 * Upon submission of this form, it updates the shared context's state (via `useAuth`) with
 * the new root key.
 *
 */

interface KeyImportProps {
  onSkip: () => void;
  onSuccess: (identity: Bip39Ed25519KeyIdentity) => void;
}

export function KeyImportContainer(props: PropsWithoutRef<KeyImportProps>) {
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
      props.onSuccess(identity);
    } else {
      setSnackError(Error(' One or more words in mnemonic list is malformed'));
    }
  }

  function handleClose(event?: React.SyntheticEvent, reason?: string) {
    if (reason === 'clickaway') {
      return;
    }

    setSnackError(undefined);
  }

  return (
    <Container maxWidth='lg'>
      <Typography variant='h2' align='center'>
        Import Existing Key
      </Typography>
      <form ref={_formRef} onSubmit={handleSubmit}>
        <Mnemonic wordList={wordList} mode='write' />
        <Button variant='outlined' color='secondary' startIcon={<SendIcon />} type='submit'>
          Import
        </Button>
      </form>
      <Button variant='outlined' onClick={props.onSkip}>
        Skip
      </Button>
      <KeyImportSnackbar handleClose={handleClose} snackError={snackError} />
    </Container>
  );
}

export default KeyImportContainer;
