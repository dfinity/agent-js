import MuiAlert, { AlertProps } from '@material-ui/lab/Alert';
import React from 'react';

/**
 * "An alert displays a short, important message in a way that attracts the user's attention
 * without interrupting the user's task." - https://material-ui.com/components/alert/
 * @param props props
 */
export function Alert(props: AlertProps): JSX.Element {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}
