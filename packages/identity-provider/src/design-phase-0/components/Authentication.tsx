import * as React from "react";

export default function Authentication () {
    return <>
        <WelcomeScreen />
    </>
}

function WelcomeScreen() {
    return <>
        <header>Getting Started</header>
        <button role="button">Create Profile</button>
        <p>Already have an identity profile? <a href="/login">Login</a></p>
    </>
}
