import MuiAlert, { AlertProps } from '@material-ui/lab/Alert';
import React from 'react';

export function Alert(props: AlertProps) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}
