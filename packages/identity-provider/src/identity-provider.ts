import { CONSTANTS } from './utils/constants';

export function getQueryParams(): Array<Record<string, string>> {
  const { location } = window;
  const { search } = location;

  const queryParameters = search
    .substr(1)
    .split('&')
    .map(queryParameter => {
      const [parameter, value] = queryParameter.split('=');
      return { [parameter]: value };
    });

  const redirect = queryParameters.find(qp => qp.redirect !== undefined);
  const publicKey = queryParameters.find(qp => qp.public_key !== undefined);

  if (!redirect) {
    throw Error(CONSTANTS.NO_REDIRECT);
  }
  if (!publicKey) {
    throw Error(CONSTANTS.NO_PUBKEY);
  }

  return queryParameters;
}
