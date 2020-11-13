import MatButton, { ButtonProps } from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import React from 'react';

const useStyles = makeStyles({
  btnPrimary: {
    background: 'linear-gradient(45deg, #ED1E79 30%, #522785 90%)',
    fontWeight: 600,
    border: 0,
    borderRadius: 3,
    boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
    color: 'white',
    height: 48,
    padding: '0 30px',
    letterSpacing: '2px',
  },
});

export const Button = (props: ButtonProps) => {
  const classes = useStyles();

  return (
    <MatButton
      {...props}
      className={classes.btnPrimary}
      color={props.color}
      onClick={props.onClick}
    >
      {props.children}
    </MatButton>
  );
};
