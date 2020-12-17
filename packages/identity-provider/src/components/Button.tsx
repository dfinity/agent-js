import MatButton, { ButtonProps } from '@material-ui/core/Button';
import React from 'react';

export const Button = Object.assign(
  (props: Pick<ButtonProps, "href"|"onClick"|"color"|"children"|"disabled"|"role"|"className">) => {
    const { onClick, color, href, ...rootProps } = props;
    const muiProps = { onClick, color, href };
    return (
      <span {...rootProps}>
        <MatButton {...muiProps}>
          {props.children}
        </MatButton>
      </span>
    );
  },
  {
    displayName: 'Button',
  },
)
