import * as React from 'react';
import Paper from '@material-ui/core/Paper';
import { styled } from '@material-ui/core/styles';
import { Grid } from '@material-ui/core';

// Wrapper of whole 'layout'. Pad. White bg.
const PaddedPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const MinHeightViewportHeight = styled('div')({
  minHeight: '100vh',
});

const Container: React.FunctionComponent = ({ children }) => {
  const Margin = styled('div')({ margin: '1em' });
  const CenterText = styled('div')({ textAlign: 'center' });
  const WidthLimiter = styled('div')({ maxWidth: '60em', marginLeft: 'auto', marginRight: 'auto' });
  return (
    <>
      <MinHeightViewportHeight>
        <WidthLimiter>
          <Grid container direction='column' justify='center'>
            <Grid item xs={12}>
              <Margin>
                <CenterText>{children}</CenterText>
              </Margin>
            </Grid>
          </Grid>
        </WidthLimiter>
      </MinHeightViewportHeight>
    </>
  );
};

/**
 * Common Layout for all Authentication Screens.
 * * Add padding around the whole page.
 * * render on <Paper />
 * @param props props
 * @param props.children - elements to render inside layout
 */
export default function AuthenticationScreenLayout(props: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <>
      <Container>
        <PaddedPaper>
          <div>{props.children}</div>
        </PaddedPaper>
      </Container>
    </>
  );
}
