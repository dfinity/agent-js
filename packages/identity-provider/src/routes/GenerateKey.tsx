import { Container, Typography } from '@material-ui/core';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'src/components/Button';

export const GenerateKey = () => {
  const history = useHistory();
  return (
    <Container>
      <Typography variant={'h2'}>Generate New Key</Typography>
      <Button onClick={() => history.goBack()}>Back</Button>
    </Container>
  );
};

export default GenerateKey;
