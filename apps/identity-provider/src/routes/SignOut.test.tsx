import { mount } from 'enzyme';
import * as React from 'react';
import SignOut from './SignOut';

describe('SignOutRoute', () => {
  it('renders with a page when there is not returnTo argument', () => {
    const el = mount(<SignOut />);
    expect(el.find('h1').text()).toEqual('Sign Out');
  });
});
