import * as React from 'react';
import { Button } from 'src/components/Button';
import SimpleScreenLayout from '../layout/SimpleScreenLayout';
import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import * as authentication from '@dfinity/authentication';

/**
 * Last screen. Indicate that there is now a whole AuthenticationResponse.
 * The end-user can click to finish the authentication flow,
 * and send the response back to the RP redirect_uri via redirect.
 * @param props props
 * @param props.request - ic-id AuthenticationRequest
 * @param props.response - ic-id AuthenticationResponse
 * @param props.redirectWithResponse - Call this to finish the authn flow and send the response.
 */
export default function (props: {
  request: authentication.request.AuthenticationRequest;
  response: authentication.response.AuthenticationResponse;
  redirectWithResponse(spec: {
    request: authentication.request.AuthenticationRequest;
    response: authentication.response.AuthenticationResponse;
  }): void;
}): JSX.Element {
  const { request, response } = props;
  console.log('AuthenticationResponseConfirmationScreen', { request, response });
  return (
    <>
      <div data-test-id='authentication-response-confirmation-screen'>
        <SimpleScreenLayout
          {...{
            HeroImage,
            Title: () => <>You're all set!</>,
            Body: () => <>Click 'Finish' to return to the app.</>,
            CallToAction: () => (
              <>
                <Button href='/'>Start over</Button>
                <Button
                  role='button'
                  variant='outlined'
                  color='primary'
                  data-test-id='redirect-with-response'
                  onClick={() => props.redirectWithResponse({ request, response })}
                >
                  Finish
                </Button>
              </>
            ),
          }}
        />
      </div>
    </>
  );
}

function HeroImage() {
  return (
    <>
      <VerifiedUserIcon style={{ fontSize: '4em' }} />
    </>
  );
}
