import MatButton, { ButtonProps } from '@material-ui/core/Button';
import { withStyles, createStyles, Theme } from '@material-ui/core/styles';
import React from 'react';

const styles = ({ breakpoints, spacing }: Theme) => createStyles({
  root: {
    marginLeft: spacing(1),
    marginRight: spacing(1),
    maxWidth: `calc(100% - ${spacing(1)}px)`,
    whiteSpace: 'nowrap'
  },
  [breakpoints.down('xs')]: {
    label: {
      display: 'block'
    }
  }
});

const SpacedMatButton = withStyles(styles)((props: ButtonProps) => 
  <MatButton {...props} classes={props.classes}  />
);

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