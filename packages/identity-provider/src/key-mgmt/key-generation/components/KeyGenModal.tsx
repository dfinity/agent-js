import { createStyles, DialogContent, DialogTitle, makeStyles } from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import React, { FormEvent } from 'react';
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

/**
 * This Component is responsible solely for displaying a mnemonic
 *    that has just been created, and having the user verify the
 *    information.
 */
export function KeyGenModal({
  showConfirmModal,
  setShowConfirmModal,
  _formRef,
  handleSubmit,
  mnemonic,
}: {
  showConfirmModal: boolean;
  setShowConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
  _formRef: React.RefObject<HTMLFormElement>;
  handleSubmit: (ev: FormEvent) => void;
  mnemonic: string[];
}) {
  const classes = useStyles();
  return (
    <Modal
      fullWidth={true}
      maxWidth='lg'
      open={showConfirmModal}
      onClose={() => setShowConfirmModal(false)}
    >
      <DialogTitle>Confirm your Mnemonic</DialogTitle>

      <DialogContent>
        <form ref={_formRef} onSubmit={handleSubmit}>
          <Mnemonic wordList={mnemonic} mode='write' />
          <Button
            type='submit'
            variant='outlined'
            color='secondary'
            startIcon={<SendIcon />}
            className={classes.submit}
          >
            Confirm
          </Button>
        </form>
      </DialogContent>
    </Modal>
  );
}
