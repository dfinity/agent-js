import * as React from "react";

export default function (props: {
    redirectWithResponse(): void;
}) {
    return <div data-test-id="authentication-response-confirmation-screen">
        <header>You're all set!</header>
        <p>
            <a href="/design-phase-1">Start over</a>
        </p>
        <button role="button" data-test-id="redirect-with-response" onClick={props.redirectWithResponse}>Redirect</button>
    </div>
}
