import * as React from "react";

/**
 * Demo Route for testing out the Identity Provider functionality as a relying party.
 * In the wild, the RP should almost always be an entirely separate codebase.
 * This is just for testing/demoing while we proof of concept the whole integration.
 */
export default function RelyingPartyDemo() {
    return <>
        <h1>Relying Party Demo</h1>
    </>
}
