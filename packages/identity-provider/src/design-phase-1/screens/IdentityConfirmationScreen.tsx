import * as React from "react";
import { Button } from "src/components/Button";

export default function (props: {
    /** href of page to go to when user clicks 'next' button */
    next: string;
}) {
    return <div data-test-id="identity-confirmation-screen">
        <header>Your Profile Identity</header>
        <dl>
            <dt>Your profile address</dt><dd><code>TODO</code></dd>
        </dl>
        <Button role="button" data-test-id="cancel">Cancel</Button>
        <Button role="button" data-test-id="next" href={props.next}>Next</Button>
    </div>
}
