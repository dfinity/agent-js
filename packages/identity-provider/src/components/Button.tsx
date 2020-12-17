import MatButton, { ButtonProps } from '@material-ui/core/Button';
import React from 'react';

export const Button = Object.assign(
  (props: Pick<ButtonProps, "type"|"startIcon"|"variant"|"href"|"onClick"|"color"|"children"|"disabled"|"role"|"className">) => {
    return (
      <MatButton {...props} />
    )
  },
  {
    displayName: 'Button',
  },
)
