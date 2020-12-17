import * as React from "react";
import { Button } from "src/components/Button";

export default function WelcomeScreen(props: {
    next: string
}) {
    return <>
        <header>Getting Started</header>
        <Button role="button" data-test-id="next" href={props.next}>Create Profile</Button>
        {/* <p>Already have an identity profile? <a href="login">Login</a></p> */}
    </>
}
