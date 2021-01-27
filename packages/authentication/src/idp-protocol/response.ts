export function isMaybeAuthenticationResponseUrl(url: URL) {
  return url.searchParams.has('access_token');
}
