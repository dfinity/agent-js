import * as React from 'react';
import { render } from '@testing-library/react';
import WelcomeScren from './WelcomeScreen';

describe('@dfinity/identity-provider/design-phase-0/WelcomeScren', () => {
  it('renders with without crashing', () => {
    const { container } = render(<WelcomeScren createProfile={() => {}} />);
    expect(container).toMatchSnapshot();
  });
});
