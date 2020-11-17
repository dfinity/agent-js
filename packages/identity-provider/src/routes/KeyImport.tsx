import { Container, Typography } from '@material-ui/core';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'src/components/Button';
import { Mnemonic } from 'src/components/MnemonicDisplay';

function bip39WordValidator(word: string): boolean {
  return word.length > 0;
}

export const KeyImport = () => {
  const history = useHistory();
  const [err, setErr] = useState('');

  const wordList = [];
  for (let i = 0; i < 24; i++) {
    wordList.push('');
  }

  function handleSubmit(formEl: HTMLFormElement): void {
    const rawInputEls = formEl.querySelectorAll<HTMLInputElement>('input[type="text"]');
    const texts = Array.from(rawInputEls).map(ch => ch?.value);
    const validated = texts.every(bip39WordValidator);

    if (validated) {
      alert('GOOD JOB');
      // @TODO: do something with the validated mnemonic
    } else {
      setErr('one or more words in mnemonic list is malformed');
    }
  }

  return (
    <Container maxWidth={'lg'}>
      <Typography variant={'h2'}>Import Existing Key</Typography>
      <Button variant={'outlined'} onClick={() => history.goBack()}>
        Back
      </Button>
      <div>
        <Mnemonic wordList={wordList} mode="write" onSubmit={handleSubmit} />
      </div>
    </Container>
  );
};

export default KeyImport;
