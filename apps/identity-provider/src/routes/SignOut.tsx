import * as React from 'react';

/**
 * A `/signout?returnTo=...` route that simply returns to the original route. This is
 * for future compliance if we ever support revoking session keys.
 * @param props Properties.
 * @param props.returnTo A URL to redirect the user to. If missing, will try to use the
 *                       query parameter.
 */
export default function SignOutRoute(props: { returnTo?: string }): JSX.Element {
  let returnTo: string | null | undefined = props.returnTo;
  if (!returnTo) {
    const params = new URLSearchParams(window.location.search);
    returnTo = params.get('returnTo');
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
