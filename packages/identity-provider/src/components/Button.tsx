import MatButton, { ButtonProps } from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import React from 'react';

export const Button = (props: ButtonProps) => {
  return (
    <MatButton color={props.color} onClick={props.onClick} {...props}>
      {props.children}
    </MatButton>
  );
};
