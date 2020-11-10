import * as CONSTANTS from './utils/constants';

interface RequiredQueryParameters {
  redirectURI: string;
  loginHint: string;
}

// should look like window.location.search, i.e. ?key=value&secondKey=secondValue
export function getRequiredQueryParams(search: string): RequiredQueryParameters {
  const searchParams = new URLSearchParams(search.substr(1));

  const redirectURI = searchParams.get(CONSTANTS.REDIRECT_QUERY_PARAM);
  if (redirectURI === null) {
    throw Error(CONSTANTS.NO_REDIRECT);
  }

  const loginHint = searchParams.get(CONSTANTS.LOGIN_HINT_PARAM);
  if (loginHint === null) {
    throw Error(CONSTANTS.NO_PUBKEY);
  }

  return { redirectURI, loginHint };
}
