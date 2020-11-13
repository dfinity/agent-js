import { Container, Typography } from '@material-ui/core';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'src/components/Button';
import { MnemonicDisplay } from 'src/components/MnemonicDisplay';

const words =
  'rain chronic window volume pluck holiday risk snake ribbon family someone half love target jeans copy seven gift basic anger insane leader argue file';
const wordList = words.split(' ');

export const GenerateKey = () => {
  const history = useHistory();
  return (
    <Container>
      <Typography variant={'h2'}>Generate New Key</Typography>
      <Button variant={'outlined'} onClick={() => history.goBack()}>
        Back
      </Button>
      <MnemonicDisplay wordList={wordList} />
    </Container>
  );
};

export default GenerateKey;
