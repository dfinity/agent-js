import MatButton, { ButtonProps } from '@material-ui/core/Button';
import { styled } from '@material-ui/core/styles';
import React from 'react';

const SpacedMatButton = styled(MatButton)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  marginRight: theme.spacing(1),
}));

export const Button = Object.assign(
  (
    props: Pick<
      ButtonProps,
      | 'fullWidth'
      | 'type'
      | 'startIcon'
      | 'variant'
      | 'href'
      | 'onClick'
      | 'color'
      | 'children'
      | 'disabled'
      | 'role'
      | 'className'
    >,
  ) => {
    return <SpacedMatButton {...props} />;
  },
  {
    displayName: 'Button',
  },
);
