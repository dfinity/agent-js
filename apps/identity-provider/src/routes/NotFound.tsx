import * as React from 'react';
import { useRouteMatch } from 'react-router-dom';

/**
 * Route to show when there is no better route found, i.e. an HTTP 404 Not Found error page.
 */
export default function NotFoundRoute(): JSX.Element {
  const { path } = useRouteMatch();
  return (
    <>
      <h1>Not Found</h1>
      <p>
        You accessed <code>{path}</code>, but there is no web page here.
      </p>
    </>
  );
}
