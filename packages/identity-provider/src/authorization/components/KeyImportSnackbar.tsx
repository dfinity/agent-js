import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import React, { PropsWithoutRef } from 'react';

interface KeyImportSnackbarProps {
  snackError?: Error;
  handleClose: () => void;
}

export function KeyImportSnackbar({
  handleClose,
  snackError,
}: PropsWithoutRef<KeyImportSnackbarProps>) {
  return (
    <Snackbar open={snackError !== undefined}>
      <Alert onClose={handleClose} severity='error'>
        Error encountered: {snackError?.message}
      </Alert>
    </Snackbar>
  );
}
