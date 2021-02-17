import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import React, { PropsWithoutRef, useState } from 'react';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
      margin: theme.spacing(1),
    },
    paper: {
      padding: theme.spacing(2),
      textAlign: 'center',
      color: theme.palette.text.secondary,
    },
  }),
);

function InputWord(word: string, i: number) {
  const [, setVal] = useState('');
  const [err, setErr] = useState(false);
  return (
    <Grid key={i} xs={6} sm={3} item>
      <TextField
        helperText={err ? 'Word cannot be empty' : null}
        error={err}
        onChange={({ target }) => {
          setVal(target.value);
          if (target.value.length < 1) {
            setErr(true);
          } else {
            setErr(false);
          }
        }}
        label={i + 1 + '.'}
        placeholder={'type word here'}
        defaultValue={word}
        variant='outlined'
      />
    </Grid>
  );
}

function DisplayWord(word: string, i: number) {
  const classes = useStyles();
  return (
    <Grid key={i} item xs={6} sm={4} md={3} lg={2}>
      <Paper className={classes.paper} elevation={2}>
        {word}
      </Paper>
    </Grid>
  );
}

interface MnemonicProps {
  wordList: string[];
  mode: 'read' | 'write';
  onSubmit?: (val: HTMLFormElement) => void;
}

export const Mnemonic = (props: PropsWithoutRef<MnemonicProps>): JSX.Element => {
  const { wordList, mode } = props;

  return (
    <Container>
      <Grid container spacing={4}>
        {mode === 'read' ? wordList.map(DisplayWord) : wordList.map(InputWord)}
      </Grid>
    </Container>
  );
};
