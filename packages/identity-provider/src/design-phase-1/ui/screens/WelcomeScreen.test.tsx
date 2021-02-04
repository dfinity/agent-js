import { mount } from 'enzyme';
import * as React from 'react';
import WelcomeScreen from './WelcomeScreen';

describe('@dfinity/identity-provider/design-phase-0/WelcomeScren', () => {
  it('renders with content', () => {
    function noop() {
      /**/
    }
    const el = mount(
      <WelcomeScreen useIdentity={noop} identity={undefined} createProfile={noop} />,
    );
    expect(el.find('[data-test-id="next"]').hostNodes().text().toLowerCase()).toContain(
      'create profile',
    );
    expect(el.find('[data-test-id="title"]').hostNodes().text().toLowerCase()).toContain(
      'getting started',
    );
  });
});
