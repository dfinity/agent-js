import { css } from '@emotion/css';
import { Grid } from '@material-ui/core';
import React from 'react';

interface Props {
  children?: React.ReactNode;
}

function Container(props: Props) {
  const { children } = props;

  return (
    <Grid component='main' justify='center' spacing={2} className={mainCSS}>
      {children}
    </Grid>
  );
}

export default Container;

const mainCSS = css`
  padding: 124px 24px 0;
  min-height: 100vh;

  .content {
    display: flex;
    flex-direction: column;
    text-align: center;
    align-items: center;
  }

  @media (min-width: 767px) {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-column-gap: 17px;
    max-width: 945px;
    padding: 0;
    margin: 67px auto auto;
    min-height: calc(100vh - 67px);

    .content {
      padding: 62px 0;
      grid-column-start: 3;
      grid-column-end: span 8;
    }
  }

  h1 {
    font-family: Roboto;
    font-style: normal;
    font-weight: normal;
    font-size: 24px;
    line-height: 28px;
    text-align: center;
  }
  p {
    font-family: Roboto;
    font-style: normal;
    font-weight: normal;
    font-size: 14px;
    line-height: 16px;
    text-align: center;
  }
`;
