import { shallow, mount } from 'enzyme';
import * as React from "react";
import WelcomeScren from "./WelcomeScreen";

describe('@dfinity/identity-provider/design-phase-0/WelcomeScren', () => {
    it('renders with content', () => {
        const el = mount(<WelcomeScren createProfile={() => {}} />)
        expect(el.find('[data-test-id="next"]' ).hostNodes().text().toLowerCase()).toContain('create profile')
        expect(el.find('[data-test-id="title"]').hostNodes().text().toLowerCase()).toContain('getting started')
        // expect(el.text().toLowerCase()).toContain('already have an identity profile? login')
    })
});
