import * as React from "react";
import { Button } from "src/components/Button";
import { hexEncodeUintArray } from "src/bytes";

export type Identity = {
    toDer(): ArrayBuffer
}

export default function (props: {
    /** href of page to go to when user clicks 'next' button */
    next: string;
    identity?: Identity
}) {
    const { identity } = props;
    return <div data-test-id="identity-confirmation-screen">
        <header>Your Profile Identity</header>
        {
            identity
            ? <>
                <dl>
                    <dt>Your profile address</dt><dd><code>{hexEncodeUintArray(new Uint8Array(identity.toDer()))}</code></dd>
                </dl>
            </>
            : <>
                No identity set.
            </>
        }
        <Button role="button" data-test-id="cancel">Cancel</Button>
        <Button role="button" data-test-id="next" href={props.next}>Next</Button>
    </div>
}
