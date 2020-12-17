import * as React from "react";
import { Button } from "src/components/Button";

export default function (props: {
    next: string;
}) {
    return <div data-test-id="session-consent-screen">
        <header>Authorize Session</header>
        <p>TODO: show session identifier</p>
        <Button role="button" data-test-id="deny-authorize-session">Deny</Button>
        <Button role="button" data-test-id="allow-authorize-session" href={props.next}>Allow</Button>
    </div>
}
