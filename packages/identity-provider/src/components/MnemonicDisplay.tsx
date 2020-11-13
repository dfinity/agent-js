import { Container, createStyles, Grid, makeStyles, Paper, Theme } from '@material-ui/core';
import React, { ComponentProps, Fragment, PropsWithoutRef } from 'react';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    paper: {
      padding: theme.spacing(1),
      textAlign: 'center',
      color: theme.palette.text.secondary,
    },
  }),
);

function WordRow({ wordList }: { wordList: string[] }) {
  const classes = useStyles();
  return (
    <Fragment>
      {wordList.map((str, i) => {
        return (
          <Grid key={i} item xs={4}>
            <Paper className={classes.paper}>{str}</Paper>
          </Grid>
        );
      })}
    </Fragment>
  );
}

export const MnemonicDisplay = (props: PropsWithoutRef<{ wordList: string[] }>) => {
  const { wordList } = props;

  const nestedWordList: string[][] = [];
  for (let i = 0, j = 6; i < wordList.length; i += 6, j += 6) {
    nestedWordList.push(wordList.slice(i, j));
  }

  return (
    <Container>
      <Grid container spacing={1}>
        {nestedWordList.map((wordListSegment, i) => (
          <Grid key={wordListSegment.join('-')} container item xs={12} spacing={2}>
            <WordRow wordList={wordListSegment} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
