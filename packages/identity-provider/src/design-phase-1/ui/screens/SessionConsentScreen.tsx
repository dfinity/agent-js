import * as React from "react";
import { Button } from "src/components/Button";
import { hexEncodeUintArray } from "src/bytes";

export default function (props: {
    next: string;
    session: {
        toDer(): ArrayBuffer|undefined
    }
}) {
    const sessionDerHex: string|undefined = React.useMemo(
        () => {
            const der = props.session.toDer()
            if (!der) return;
            const hex = hexEncodeUintArray(new Uint8Array(der));
            return hex;
        },
        [props.session]
    )
    return <div data-test-id="session-consent-screen">
        <header>Authorize Session</header>
        <dl>
            <dt>hex(der(session))</dt><dd>
                {sessionDerHex || "(not set)"}
            </dd>
        </dl>
        <Button role="button" data-test-id="deny-authorize-session">Deny</Button>
        <Button role="button" data-test-id="allow-authorize-session" href={props.next}>Allow</Button>
    </div>
}
