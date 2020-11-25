import { KeyPair } from '@dfinity/agent';
import { DelegationChain } from '@dfinity/authentication';
import {
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Paper,
  Typography,
} from '@material-ui/core';
import WarningIcon from '@material-ui/icons/WarningOutlined';
import React, { Fragment, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'src/components/Button';
import { Modal } from 'src/components/Modal';
import { useAuth } from 'src/hooks/use-auth';
import { ROUTES } from 'src/utils/constants';

/**
 * This component is responsible for handling the top-level authentication flow.
 * What should it do?
 *    1. Check whether or not the user has an existing Root Delegation Key
 *    2. If not, offer to either generate or import a Root Identity
 *    3. Create a Root Delegation based on the now-definitely-existing Root Identity
 *    4. Prompt the user to create a Session Delegation Key
 *    5. Use the `login_hint` query parameter to create the session delegation Key
 *    6. Prompt the user to redirect now that the delegation chains exist
 */
export function AuthorizationRoute() {
  console.log('render');
  const auth = useAuth();
  const history = useHistory();

  const [showModal, setShowModal] = useState(false);
  const [rootKeys, setRootKeys] = useState<KeyPair>();
  const [rootDelegationChain, setRootDelegationChain] = useState<DelegationChain>();

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

  return (
    <Fragment>
      <Typography variant='h2' style={{ textAlign: 'center' }}>
        Identity Provider
      </Typography>
      <Paper elevation={1} style={{ height: '50vh' }}>
        <Grid container spacing={2} justify='center'>
          <Grid item>
            {rootDelegationChain ? (
              rootKeys ? (
                <Fragment>
                  <Typography variant='body1'>
                    Looks like we've found an existing set of credentials for you. Would you like to
                    authorize this device with those credentials?
                    <Button color='primary'>Authorize this device</Button>
                    <Button color='secondary' variant='outlined' startIcon={<WarningIcon />}>
                      Clear credentials
                    </Button>
                  </Typography>
                </Fragment>
              ) : (
                <Typography variant='h2'>
                  Looks like we have Root Delegation Chain and Root Keys :D{' '}
                </Typography>
              )
            ) : null}
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
              <Button color='secondary' variant='outlined' onClick={handleImport}>
                Import Existing Key
              </Button>
            </Grid>
            <Grid item>
              <Button color='primary' onClick={handleGenerate}>
                Generate New Key
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
      </Modal>
    </Fragment>
  );
}

export default AuthorizationRoute;
