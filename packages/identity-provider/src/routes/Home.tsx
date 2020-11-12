import React, { Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import { getRequiredQueryParams } from 'src/identity-provider';

export const Home = () => {
  const location = useLocation().search;
  try {
    const { loginHint, redirectURI } = getRequiredQueryParams(location);
    return (
      <Fragment>
        <span>login hint:{loginHint}</span>
        <br />
        <span>redirect:{redirectURI}</span>
      </Fragment>
    );
  } catch (error) {
    return <h2>Error: {error.message}</h2>;
  }
};

export default Home;
