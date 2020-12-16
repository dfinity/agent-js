import { shallow, mount } from 'enzyme';
import * as React from "react";

import Authentication from "./Authentication";

describe('@dfinity/identity-provider/design-phase-0/Authentication', () => {
    it('renders with content', () => {
        const el = mount(<Authentication />)
        expect(el.find('button').text().toLowerCase()).toContain('create profile')
        expect(el.find('header').text().toLowerCase()).toContain('getting started')
        expect(el.text().toLowerCase()).toContain('already have an identity profile? login')
    })
});
