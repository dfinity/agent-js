import React from 'react';
import { Redirect } from 'react-router-dom';

/**
 * The Authorization route which relying parties should use to start the authorization flow.
 * For now this redirects to `/welcome`, but could change in the future. The important part
 * is that the route leading to this component does not change.
 */
export default function AuthorizeRoute(): JSX.Element {
  return (
    <Redirect to={`/welcome${location.search}`} />
  )
}
