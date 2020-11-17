import MatDialog, { DialogProps } from '@material-ui/core/Dialog';
import React from 'react';

export const Modal = (props: DialogProps) => {
  return <MatDialog {...props}>{props.children}</MatDialog>;
};
