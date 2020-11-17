import {
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Paper,
  Typography,
} from '@material-ui/core';
import React, { Fragment, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'src/components/Button';
import { Modal } from 'src/components/Modal';
import { useAuth } from 'src/hooks/use-auth';
import { ROUTES } from 'src/utils/constants';

export const Login = () => {
  const auth = useAuth();

  const [showModal, setShowModal] = useState(false);

  const history = useHistory();

  const handleImport = () => {
    setShowModal(false);
    history.push(ROUTES.KEY_IMPORT, { webauthnId: auth.webauthnId });
  };
  const handleGenerate = () => {
    setShowModal(false);
    history.push(ROUTES.KEY_GENERATION, { webauthnId: auth.webauthnId });
  };

  const onRegister = () => {
    setShowModal(true);
  };

  return (
    <Fragment>
      <Typography variant={'h2'} style={{ textAlign: 'center' }}>
        Identity Provider
      </Typography>
      <Paper elevation={1} style={{ height: '50vh' }}>
        <Grid container spacing={2} justify={'center'}>
          <Grid item>
            {auth.webauthnId ? (
              <span>webauthnId:{auth.webauthnId}</span>
            ) : (
              <Button color={'primary'} onClick={onRegister} style={{ marginTop: '50%' }}>
                Register with the Internet Computer
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Modal fullWidth={true} maxWidth={'sm'} open={showModal} onClose={() => setShowModal(false)}>
        <DialogTitle>Register Your Device</DialogTitle>
        <DialogContent>
          <DialogContentText>
            It appears we haven't seen this device before. Please generate a new key, or import an
            existing key by selecting one of the options below.
          </DialogContentText>
          <Grid container justify={'space-between'}>
            <Grid item>
              <Button color="secondary" variant={'outlined'} onClick={handleImport}>
                Import Existing Key
              </Button>
            </Grid>
            <Grid item>
              <Button color="primary" onClick={handleGenerate}>
                Generate New Key
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
      </Modal>
    </Fragment>
  );
};

export default Login;
