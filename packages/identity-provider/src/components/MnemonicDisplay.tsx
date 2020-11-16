import { Container, createStyles, Grid, makeStyles, Paper, Theme } from '@material-ui/core';
import React, { ComponentProps, Fragment, PropsWithoutRef } from 'react';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    paper: {
      padding: theme.spacing(2),
      textAlign: 'center',
      color: theme.palette.text.secondary,
    },
  }),
);


export const MnemonicDisplay = (props: PropsWithoutRef<{ wordList: string[] }>) => {
  const { wordList } = props;
  const classes = useStyles();
  return (
    <Container>
      <Grid container spacing={4}>
        {wordList.map((word, i) => {
          return (
            <Grid key={i} item xs={6} sm={4} md={3} lg={2}>
              <Paper className={classes.paper} elevation={2}>{word}</Paper>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};
