import { Ed25519KeyIdentity } from '@dfinity/authentication';
import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import RPAuthenticationButton from '../components/RPAuthenticationButton';
import { IRelyingPartyAuthenticationSession } from '../session';
import { IStorage } from '../storage';
import { css } from '@emotion/css';
import { Grid } from '@material-ui/core';
import ProgressBlobs from '../components/ProgressBlobs';
import { Link } from 'react-router-dom';
/**
 * Demo Route for testing out the Identity Provider functionality as a relying party.
 * In the wild, the RP should almost always be an entirely separate codebase.
 * This is just for testing/demoing while we proof of concept the whole integration.
 *
 * What should it do?
 * * Show a button that the end-user can click to initiate the authentication flow (i.e. redirect to /authorization + AuthenticationRequest)
 * * @todo(bengo) - include a redirect_uri in the AuthenticationRequest that, when redirected back to with an AuthenticationResponse, does realistic things (i.e. shows the user the AuthenticationResponse that the RP redirct_uri receives)
 */

export default function RelyingPartyDemo(props: {
  redirectUrl: URL;
  sessionStorage: IStorage<IRelyingPartyAuthenticationSession>;
  identityProviderUrl: URL;
}) {
  const [t] = useTranslation('translations');

  const identityProviderUrl = props.identityProviderUrl;
  const [session, setSession] = React.useState<IRelyingPartyAuthenticationSession>({
    type: 'RelyingPartyAuthenticationSession',
    identity: Ed25519KeyIdentity.generate(),
  });
  // Whenever session changes, serialize it and save to localStorage
  React.useEffect(() => {
    props.sessionStorage.set(session);
  }, [session]);

  return (
    <Grid component='main' justify='center' spacing={2} className={mainCSS}>
      <picture className={pictureCSS}></picture>
      <Trans i18nKey='RPHome-title'>
        <h1>Identity Account</h1>
      </Trans>
      <Trans i18nKey='RPHome-description'>
        The application you are attempting to use requires a secure identity profile to proceed. To
        authenticate this browser on the Internet Computer, please click the link below.
      </Trans>
      <ProgressBlobs />
      <RPAuthenticationButton
        redirectUrl={props.redirectUrl}
        delegateTo={session.identity.getPublicKey()}
        identityProviderUrl={identityProviderUrl}
        state='RPDemo-sample-state'
      >
        {t('generate')}
      </RPAuthenticationButton>

      <p>
        <Trans i18nKey='have-key'>Already have an identity key?</Trans>{' '}
        <Link to='/sign-in'>{t('sign-in')}</Link>
      </p>
    </Grid>
  );
}

const mainCSS = css`
  padding: 124px 24px 0;
  display: flex;
  flex-direction: column;
  text-align: center;
  align-items: center;

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

const pictureCSS = css`
  min-height: 188px;
  width: 100%;
  display: flex;
  background-color: #acacac;

  img {
    max-width: 100%;
    display: block;
  }
`;
