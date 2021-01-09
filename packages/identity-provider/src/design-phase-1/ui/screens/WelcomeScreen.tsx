import * as React from 'react';
import { Button } from '../../../components/Button';
import { makeStyles, Typography } from '@material-ui/core';
import SimpleScreenLayout from '../layout/SimpleScreenLayout';
import LockIcon from '@material-ui/icons/Lock';

const styler = () => {
  return {};
};

export default function WelcomeScreen(props: { createProfile(): void }) {
  const styles = makeStyles(styler)();
  const { createProfile } = props;
  const onClickCreateProfile = React.useCallback(createProfile, [createProfile]);
  return (
    <SimpleScreenLayout
      {...{
        HeroImage,
        Title,
        Body,
        CallToAction: () => <CallToAction {...{ onClickCreateProfile }} />,
      }}
    />
  );
}

function CallToAction(props: { onClickCreateProfile(): void }) {
  return (
    <>
      <Button
        variant='contained'
        color='primary'
        data-test-id='next'
        className='create-profile'
        role='button'
        onClick={props.onClickCreateProfile}
      >
        Create Profile
      </Button>
    </>
  );
}
function Title() {
  return <>Getting Started</>;
}

function Body() {
  return (
    <Typography variant='body1' gutterBottom>
      Create a Profile to use this{' '}
      <a target='_blank' href='https://internetcomputer.org'>
        Internet Computer
      </a>{' '}
      Canister.
    </Typography>
  );
}

function HeroImage() {
  return (
    <>
      <LockIcon style={{ fontSize: '4em' }} />
    </>
  );
}
