import {
  Button,
  Container,
  createStyles,
  FormHelperText,
  Grid,
  Input,
  makeStyles,
  Paper,
  TextField,
  Theme,
} from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import React, { createRef, FormEvent, PropsWithoutRef, useState } from 'react';

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
    form: {
      marginTop: theme.spacing(5),
      marginBottom: theme.spacing(5),
      display: 'flex',
      flexDirection: 'column',
    },
    submit: {
      marginTop: theme.spacing(2),
      alignSelf: 'flex-end',
    },
  }),
);

function InputWord(_word: string, i: number) {
  const [_val, setVal] = useState('');
  const [err, setErr] = useState(false);
  return (
    <Grid key={i} xs={6} sm={4} item>
      <TextField
        helperText={err ? 'Word cannot be empty' : null}
        error={err}
        onChange={({ target }) => {
          setVal(target.value);
          if (target.value.length < 1) {
            setErr(true);
          }
        }}
        label={i + '.'}
        placeholder={'type word here'}
        variant="outlined"
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

export const Mnemonic = (props: PropsWithoutRef<MnemonicProps>) => {
  const { wordList, mode } = props;
  const _formRef = createRef<HTMLFormElement>();
  const classes = useStyles();

  function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const { current } = _formRef;
    if (current && props.onSubmit) {
      props.onSubmit(current);
    }
  }

  return (
    <Container>
      {mode === 'read' ? (
        <Grid container spacing={4}>
          {wordList.map(DisplayWord)}
        </Grid>
      ) : (
        <form ref={_formRef} onSubmit={handleSubmit} className={classes.form}>
          <Grid container spacing={6}>
            {wordList.map(InputWord)}
          </Grid>
          <Button
            type={'submit'}
            variant={'outlined'}
            color={'secondary'}
            startIcon={<SendIcon />}
            className={classes.submit}
          >
            Submit
          </Button>
        </form>
      )}
    </Container>
  );
};
