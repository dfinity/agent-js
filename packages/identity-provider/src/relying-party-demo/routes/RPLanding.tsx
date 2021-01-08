import Container from '@dfinity/identity-provider/src/relying-party-demo/components/Container';
import { css } from '@emotion/css';
import { Button } from '@material-ui/core';
import React from 'react';
import { Trans } from 'react-i18next';
import { useHistory } from 'react-router-dom';

interface Props {}

function RPLanding(props: Props) {
  const {} = props;
  const history = useHistory();

  return (
    <Container>
      <section className={sectionStyles}>
        <h1>
          <Trans i18nKey='landing-title'>Coolest App Ever</Trans>
        </h1>
        <p>
          At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium
          voluptatum.
        </p>
        <Button color='primary' onClick={() => history.push('./onboarding')}>
          <Trans i18nKey='play'>Play</Trans>
        </Button>
      </section>
      <div className={videoStyles} style={{ padding: '75% 0 0 0', position: 'relative' }}>
        <iframe
          src='https://player.vimeo.com/video/148751763'
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          frameBorder='0'
          allow='autoplay; fullscreen'
          allowFullScreen
        ></iframe>
      </div>
      <script src='https://player.vimeo.com/api/player.js'></script>
    </Container>
  );
}

const sectionStyles = css`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  @media (min-width: 767px) {
    grid-column-start: 2;
    grid-column-end: span 4;
    height: 100%;
  }
`;

const videoStyles = css`
  @media (min-width: 767px) {
    grid-column-start: 6;
    grid-column-end: span 6;
  }
`;

export default RPLanding;
