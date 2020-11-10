import * as CONSTANTS from './utils/constants';

interface RequiredQueryParameters {
  redirectURI: string;
  publicKey: string;
}

// should look like window.location.search, i.e. ?key=value&secondKey=secondValue
export function getRequiredQueryParams(search: string): RequiredQueryParameters {

  const searchParams = new URLSearchParams(search.substr(1));

  const redirectURI = searchParams.get('redirect_uri');
  if (redirectURI === null) {
    throw Error(CONSTANTS.NO_REDIRECT);
  }

  const publicKey = searchParams.get('public_key');
  if (publicKey === null) {
    throw Error(CONSTANTS.NO_PUBKEY);
  }

  return { redirectURI, publicKey };
}
