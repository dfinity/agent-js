import * as React from "react";
import { Button } from "src/components/Button";
import { hexEncodeUintArray } from "src/bytes";
import SimpleScreenLayout from "../layout/SimpleScreenLayout";
import { Typography, makeStyles } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";
import EnhancedEncryptionIcon from '@material-ui/icons/EnhancedEncryption';

interface IDerEncodable {
    toDer(): ArrayBuffer|undefined
}

export default function (props: {
    next: string;
    session: IDerEncodable
}) {
    const { next } = props

    return <>
        <div data-test-id="session-consent-screen">
            <SimpleScreenLayout {...{
                HeroImage,
                Title,
                Body: () => <Body session={props.session} />,
                CallToAction: () => <CallToAction nextHref={next} />,
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
function Title() {
    return <>Authorize Session</>
}

function Body(props: {
    session: IDerEncodable
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
    return <>
        <Typography paragraph>{sessionDerHex || "(not set)"}</Typography>
        <Typography paragraph>
        Wos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.
        </Typography>
    </>
}

function HeroImage() {
    const styles = makeStyles(styler)();
    return <>
        <EnhancedEncryptionIcon style={{fontSize: '4em'}} />
    </>
}