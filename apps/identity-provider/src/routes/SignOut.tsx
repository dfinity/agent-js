import * as React from 'react';

/**
 * A `/signout?returnTo=...` route that simply returns to the original route. This is
 * for future compliance if we ever support revoking session keys.
 * @param propReturnTo
 * @param propReturnTo.returnTo
 */
export default function SignOutRoute(
  { returnTo: propReturnTo }: { returnTo?: string },
): JSX.Element {
  let returnTo: string | null | undefined = propReturnTo;
  if (!returnTo) {
    const params = new URLSearchParams(window.location.search);
    returnTo = propReturnTo || params.get('returnTo');
  }

  if (returnTo) {
    window.location.href = returnTo;
    return(<></>);
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
