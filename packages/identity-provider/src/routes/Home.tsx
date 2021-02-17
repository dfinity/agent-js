import * as React from 'react';

/**
 * React-renderable that renders the Internet Computer Identity Provider Home Page
 *
 * What should it do?
 * * It doesn't matter that much for now, but without anything it can be confusing why http `GET /` just looks like an empty white page (broken?) in the web browser.
 * * Probably this should do different things based on TBD product/design requirements, e.g. if someone comes here on their own, they may be doing so in order to import/export keys or otherwise browse/manage their identities.
 */
export default function HomeRoute(): JSX.Element {
  return (
    <>
      <h1>Internet Computer Identity Provider</h1>
      <p>This is a work in progress. You probably want to try out.</p>
      <ul>
        <li>
          <a href={`/design-phase-1`}>Relying Party Demo</a> - design-phase-1
        </li>
      </ul>
    </>
  );
}
