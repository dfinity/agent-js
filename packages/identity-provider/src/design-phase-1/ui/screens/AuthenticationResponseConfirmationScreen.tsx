import * as React from "react";
import { Button } from "src/components/Button";
import { hexEncodeUintArray } from "src/bytes";
import SimpleScreenLayout from "../layout/SimpleScreenLayout";
import { Typography, makeStyles } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import * as icid from "../../../protocol/ic-id-protocol"
export default function (props: {
    request: icid.AuthenticationRequest
    response: icid.AuthenticationResponse
    redirectWithResponse(spec: {
        request: icid.AuthenticationRequest
        response: icid.AuthenticationResponse
    }): void;
}) {
    const { request, response } = props;
    console.log('AuthenticationResponseConfirmationScreen', { request, response })
    return <>
        <div data-test-id="authentication-response-confirmation-screen">
            <SimpleScreenLayout {...{
                HeroImage,
                Title: () => <>You're all set!</>,
                Body: () => <>
                    Click 'Finish' to return to the app.
                </>,
                CallToAction: () => <>
                    <Button href="/">Start over</Button>
                    <Button role="button" variant="outlined" color="primary" data-test-id="redirect-with-response" onClick={() => props.redirectWithResponse({ request, response })}>Finish</Button>
                </>,
            }} />
        </div>
    </>
}


const styler = () => {
    return {
    }
}

function CallToAction(props: {
    nextHref: string;
}) {
    return <>
        <Button role="button" data-test-id="deny-authorize-session">Deny</Button>
        <Button role="button" variant="outlined" color="primary" data-test-id="allow-authorize-session" href={props.nextHref}>Allow</Button>
    </>
}

function HeroImage() {
    const styles = makeStyles(styler)();
    return <>
        <VerifiedUserIcon style={{fontSize: '4em'}} />
    </>
}