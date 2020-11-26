import { blobFromText, PublicKey } from '@dfinity/agent';
import { Ed25519PublicKey } from '@dfinity/authentication';
import { setItem } from 'localforage';
import * as CONSTANTS from './utils/constants';

interface RequiredQueryParameters {
  redirectURI: string;
  loginHint: PublicKey;
}

// should look like window.location.search, i.e. ?key=value&secondKey=secondValue
export function getRequiredQueryParams(search: string): RequiredQueryParameters {
  const searchParams = new URLSearchParams(search.substr(1));

  const redirectURI = searchParams.get(CONSTANTS.REDIRECT_QUERY_PARAM);
  if (redirectURI === null) {
    throw Error(CONSTANTS.NO_REDIRECT);
  }
  setItem(CONSTANTS.LOCAL_STORAGE_REDIRECT_URI, redirectURI);

  const loginHintRaw = searchParams.get(CONSTANTS.LOGIN_HINT_PARAM);
  if (loginHintRaw === null) {
    throw Error(CONSTANTS.NO_PUBKEY);
  }

  const loginHint: PublicKey = Ed25519PublicKey.fromDer(blobFromText(loginHintRaw));
  setItem(CONSTANTS.LOCAL_STORAGE_LOGIN_HINT, loginHint);

  return { redirectURI, loginHint };
}

//  append the token query parameter and replace the current browser location
export function appendTokenParameter(redirect: string, token: string): URL {
  const url = new URL(redirect);
  url.searchParams.append('token', token);
  return url;
}
