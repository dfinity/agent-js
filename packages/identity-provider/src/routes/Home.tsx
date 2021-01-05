import * as React from "react";
import { ROUTES } from "../utils/constants";

/**
 * React-renderable that renders the Internet Computer Identity Provider Home Page
 * 
 * What should it do?
 * * It doesn't matter that much for now, but without anything it can be confusing why http `GET /` just looks like an empty white page (broken?) in the web browser.
 * * Probably this should do different things based on TBD product/design requirements, e.g. if someone comes here on their own, they may be doing so in order to import/export keys or otherwise browse/manage their identities.
 */
export default function HomeRoute() {
    return <>
        <h1>Internet Computer Identity Provider</h1>
        <p>This is a work in progress. You probably want to try out.</p>
        <ul>
            <li><a href={ROUTES.RELYING_PARTY_DEMO}>Relying Party Demo</a> - pre-design</li>
            <li><a href={`${ROUTES.RELYING_PARTY_DEMO}/design-phase-1`}>Relying Party Demo</a> - design-phase-1</li>
        </ul>
    </>
}
