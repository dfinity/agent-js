import { Container, Typography } from '@material-ui/core';
import React, { PropsWithoutRef, useState } from 'react';
import { RouteProps, useHistory } from 'react-router-dom';
import { Button } from 'src/components/Button';
import { Mnemonic } from 'src/components/Mnemonic';
import { demoWordList } from 'src/utils/constants';

export const KeyGeneration = () => {
  const [mnemonic, setMnemonic] = useState<string[]>([]);

  function generateMnemonic() {
    // @TODO: implement bip39 mnemonic generation
    setMnemonic(demoWordList);
  }

  const history = useHistory();
  return (
    <Container>
      <Typography variant={'h2'}>Generate New Key</Typography>
      <Button variant={'outlined'} onClick={() => history.goBack()}>
        Back
      </Button>
      <Button color="primary" onClick={generateMnemonic}>
        Generate Master Key
      </Button>
      {mnemonic.length === 24 ? <Mnemonic wordList={mnemonic} mode='read' /> : null}
    </Container>
  );
};

export default KeyGeneration;
