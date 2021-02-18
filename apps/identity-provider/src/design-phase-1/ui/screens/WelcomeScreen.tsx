import * as React from 'react';
import { Button } from '../../../components/Button';
import { styled } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import SimpleScreenLayout from '../layout/SimpleScreenLayout';
import LockIcon from '@material-ui/icons/Lock';
import { SignIdentity } from '@dfinity/agent';
import { hexEncodeUintArray } from '../../../bytes';
import { Ed25519KeyIdentity, WebAuthnIdentity } from '@dfinity/authentication';

/**
 * First Screen the end-user sees as part of Authentication.
 * If they have a profile already from last time, let them re-use it.
 * Always let them click 'create profile' to create a new 'root identity' keyPair.
 * @param props props
 * @param props.identity - identity from last time, if present
 * @param props.useIdentity - invoke this with the Identity chosen by the end-user
 * @param props.createProfile - invoke this to trigger creation of a brand new profile (and then re-render)
 */
export default function WelcomeScreen(props: {
  identity: undefined | Ed25519KeyIdentity | WebAuthnIdentity;
  useIdentity(identity: Ed25519KeyIdentity | WebAuthnIdentity): void;
  createProfile(): void;
}): JSX.Element {
  const { createProfile } = props;
  const onClickCreateProfile = React.useCallback(createProfile, [createProfile]);
  return (
    <SimpleScreenLayout
      {...{
        HeroImage,
        Title,
        Body: () => <Body identity={props.identity} />,
        CallToAction: () => <CallToAction {...{ onClickCreateProfile, ...props }} />,
      }}
    />
  );
}

function CallToAction(props: {
  onClickCreateProfile(): void;
  identity: Ed25519KeyIdentity | WebAuthnIdentity | undefined;
  useIdentity(identity: SignIdentity): void;
}) {
  const { identity } = props;
  const existingIdentityString = React.useMemo(() => {
    if (!identity) return;
    return hexEncodeUintArray(identity.getPublicKey().toDer());
  }, [identity]);
  const ContinueButtonText = styled('div')({
    maxWidth: '20em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  });
  const primaryButtonProps: Partial<React.ComponentProps<typeof Button>> = {
    variant: 'contained',
    color: 'primary',
  };
  return (
    <>
      <Button
        {...(identity ? {} : primaryButtonProps)}
        data-test-id='next'
        className='create-profile'
        role='button'
        onClick={props.onClickCreateProfile}
      >
        Create Profile
      </Button>
      {identity && (
        <>
          <Button
            {...primaryButtonProps}
            onClick={() => props.useIdentity(identity)}
            data-test-id='continue-with-profile'
          >
            Continue as&nbsp;
            <ContinueButtonText>
              <span>{existingIdentityString}</span>
            </ContinueButtonText>
          </Button>
        </>
      )}
    </>
  );
}
function Title() {
  return <>Getting Started</>;
}

function Body(props: { identity?: SignIdentity }) {
  const { identity } = props;
  return (
    <>
      <Typography variant='body1' paragraph>
        Create a Profile to use this{' '}
        <a target='_blank' href='https://internetcomputer.org'>
          Internet Computer
        </a>{' '}
        Canister.
      </Typography>
      {identity && (
        <>
          <Typography variant='body1' paragraph>
            Or use your existing Profile to continue Authenticating.
          </Typography>
        </>
      )}
    </>
  );
}

function HeroImage() {
  return (
    <>
      <LockIcon style={{ fontSize: '4em' }} />
    </>
  );
}
