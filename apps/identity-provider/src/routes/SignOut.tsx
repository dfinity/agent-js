import * as React from 'react';
import { Redirect } from 'react-router-dom';

/**
 * A `/signout?returnTo=...` route that simply returns to the original route. This is
 * for future compliance if we ever support revoking session keys.
 */
export default function SignOutRoute(): JSX.Element {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo');

  if (returnTo) {
    return (
      <Redirect to={returnTo} />
    );
  }

  return (
    <>
      <h1>Sign Out</h1>
      <p>
        The protocol for signing out was not followed properly; <code>returnTo</code> argument
        missing.
      </p>
    </>
  );
}
