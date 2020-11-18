import { Bip39Ed25519KeyIdentity } from '@dfinity/authentication';
import {
  Container,
  createStyles,
  DialogContent,
  DialogTitle,
  makeStyles,
  Snackbar,
  Typography,
} from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import React, { createRef, FormEvent, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Alert } from 'src/components/Alert';
import { Button } from 'src/components/Button';
import { Mnemonic } from 'src/components/Mnemonic';
import { Modal } from 'src/components/Modal';

const useStyles = makeStyles(theme =>
  createStyles({
    submit: {
      marginTop: theme.spacing(2),
      alignSelf: 'flex-end',
    },
  }),
);

export const KeyGeneration = () => {
  const classes = useStyles();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [hasMnemonic, setHasMnemonic] = useState<boolean>(false);
  const [keypair, setKeyPair] = useState<Bip39Ed25519KeyIdentity>();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [snackError, setSnackError] = useState<Error>();
  const _formRef = createRef<HTMLFormElement>();

  function generateMnemonic() {
    const bip = Bip39Ed25519KeyIdentity.generate();
    const newMnemonic = bip.getBip39Mnemonic();
    setKeyPair(bip);
    setMnemonic(newMnemonic.split(' '));
    setHasMnemonic(true);
  }
  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const formEl = _formRef.current;
    if (formEl) {
      const rawInputEls = formEl.querySelectorAll<HTMLInputElement>('input[type="text"]');
      const texts = Array.from(rawInputEls).map(ch => ch?.value);
      const valid = texts.join(' ') === mnemonic.join(' ');
      if (valid && keypair) {
        setShowConfirmModal(false);
        const { publicKey, secretKey } = keypair.getKeyPair();
        alert(JSON.stringify({ publicKey, secretKey }));
      } else {
        setSnackError(Error('mnemonics do not match'));
      }
    }
  }

  const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackError(undefined);
  };
  const history = useHistory();
  return (
    <Container>
      <Typography variant={'h2'}>Generate New Key</Typography>

      <Snackbar open={snackError !== undefined} autoHideDuration={4000}>
        <Alert onClose={handleClose} severity={'error'}>
          Error encountered: {snackError?.message}
        </Alert>
      </Snackbar>
      <Button variant={'outlined'} onClick={() => history.goBack()}>
        Back
      </Button>
      <Button color="primary" onClick={generateMnemonic}>
        Generate Master Key
      </Button>
      {hasMnemonic ? <Mnemonic wordList={mnemonic} mode="read" /> : null}
      {hasMnemonic ? (
        <Button
          hidden={!hasMnemonic}
          color={'secondary'}
          variant={'contained'}
          onClick={() => setShowConfirmModal(true)}
        >
          Continue
        </Button>
      ) : null}

      <Modal
        fullWidth={true}
        maxWidth={'lg'}
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
      >
        <DialogTitle>Confirm your Mnemonic</DialogTitle>

        <DialogContent>
          <form ref={_formRef} onSubmit={handleSubmit}>
            <Mnemonic wordList={mnemonic} mode="write" />
            <Button
              type={'submit'}
              variant={'outlined'}
              color={'secondary'}
              startIcon={<SendIcon />}
              className={classes.submit}
            >
              Confirm
            </Button>
          </form>
        </DialogContent>
      </Modal>
    </Container>
  );
};

export default KeyGeneration;
