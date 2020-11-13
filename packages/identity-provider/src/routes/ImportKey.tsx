import { Container, Grid, TextField, Typography } from '@material-ui/core';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import SendIcon from '@material-ui/icons/Send';
import React, { useState, createRef } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'src/components/Button';

export const ImportKey = () => {
  const history = useHistory();

  const [textareaValue, setTextAreaValue] = useState('');

  const _ref = createRef<HTMLInputElement>();
  return (
    <Container maxWidth={'lg'}>
      <Typography variant={'h2'}>Import Existing Key</Typography>
      <Button variant={'outlined'} onClick={() => history.goBack()}>
        Back
      </Button>
      <div>
        <Grid container>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              multiline
              rows={6}
              onChange={({ currentTarget: { value } }) => setTextAreaValue(value)}
              defaultValue={
                'rain chronic window volume pluck holiday risk snake ribbon family someone half love target jeans copy seven gift basic anger insane leader argue file'
              }
              variant="outlined"
            />
            <Button
              onClick={() => alert('submit: ' + textareaValue)}
              variant="outlined"
              color="secondary"
              startIcon={<SendIcon />}
            >
              Submit
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant={'h3'}>OR</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Grid
              container
              justify="center"
              alignContent="center"
              alignItems="center"
              direction="column"
            >
              <Grid item>
                <input
                  ref={_ref}
                  id="mnemonic-import-by-file"
                  hidden
                  type="file"
                  accept={'text/plain'}
                />
                <Button
                  onClick={() => _ref.current?.click()}
                  variant="outlined"
                  color="secondary"
                  startIcon={<CloudUploadIcon />}
                >
                  Upload
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </div>
    </Container>
  );
};

export default ImportKey;
