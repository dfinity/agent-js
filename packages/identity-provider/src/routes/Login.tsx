import {
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Paper,
  Typography,
} from '@material-ui/core';
import React, { Fragment, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Button } from 'src/components/Button';
import { Modal } from 'src/components/Modal';
import { useAuth } from 'src/hooks/use-auth';
import { getRequiredQueryParams } from 'src/identity-provider';
import { ROUTES } from 'src/utils/constants';

export function Login() {
  const auth = useAuth();
  const history = useHistory();
  const location = useLocation<any>();

  const [showModal, setShowModal] = useState(false);

  const handleImport = () => {
    setShowModal(false);
    const state = auth ? { webauthnId: auth.webauthnId } : undefined;
    history.push(ROUTES.KEY_IMPORT, state);
  };
  const handleGenerate = () => {
    const state = auth ? { webauthnId: auth.webauthnId } : undefined;
    setShowModal(false);
    history.push(ROUTES.KEY_GENERATION, state);
  };

  const onRegister = () => {
    setShowModal(true);
  };
  useEffect(() => {
    try {
      const { redirectURI } = getRequiredQueryParams(location.search);
      auth?.setRedirectURI(redirectURI);
    } catch (error) {}
  }, []);

  return (
    <Fragment>
      <Typography variant='h2' style={{ textAlign: 'center' }}>
        Identity Provider
      </Typography>
      <Paper elevation={1} style={{ height: '50vh' }}>
        <Grid container spacing={2} justify='center'>
          <Grid item>
            {auth && auth.masterId ? (
              <Fragment>
                <span>webauthnId:{JSON.stringify(auth.masterId)}</span>
                <Button color='primary' onClick={() => auth.createDelegation()}>
                  Create Delegation
                </Button>
              </Fragment>
            ) : (
              <Button color='primary' onClick={onRegister} style={{ marginTop: '50%' }}>
                Register with the Internet Computer
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Modal fullWidth={true} maxWidth='sm' open={showModal} onClose={() => setShowModal(false)}>
        <DialogTitle>Register Your Device</DialogTitle>
        <DialogContent>
          <DialogContentText>
            It appears we haven't seen this device before. Please generate a new key, or import an
            existing key by selecting one of the options below.
          </DialogContentText>
          <Grid container justify={'space-between'}>
            <Grid item>
              <Button color="secondary" variant='outlined' onClick={handleImport}>
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
}

export default Login;
