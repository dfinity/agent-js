import * as CONSTANTS from './utils/constants';

interface RequiredQueryParameters {
  redirect: string;
  publicKey: string;
}

export function getRequiredQueryParams(): RequiredQueryParameters {
  const { location } = window;
  const { search } = location;

  const searchParams = new URLSearchParams(search.substr(1));

  const redirect = searchParams.get('redirect');
  if (redirect === null) {
    throw Error(CONSTANTS.NO_REDIRECT);
  }

  const publicKey = searchParams.get('public_key');
  if (publicKey === null) {
    throw Error(CONSTANTS.NO_PUBKEY);
  }

  return { redirect, publicKey };
}

export function redirectToCanister(token: string): void {
  const { redirect } = getRequiredQueryParams();
  const url = new URL(redirect);
  url.searchParams.append('token', token);
  location.replace('' + url);
}
