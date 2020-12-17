import * as React from "react";
import { Button } from "../../components/Button";

export default function WelcomeScreen(props: {
    next: string
}) {
    return <>
        <header>Getting Started</header>
        <span >
            <Button data-test-id="next" className="button create-profile" role="button" href={props.next}>Create Profile</Button>
        </span>
        {/* <p>Already have an identity profile? <a href="login">Login</a></p> */}
    </>
}
