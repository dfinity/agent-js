import * as React from "react";
import { Button } from "src/components/Button";
import { hexEncodeUintArray } from "src/bytes";
import SimpleScreenLayout from "../layout/SimpleScreenLayout";
import Skeleton from "@material-ui/lab/Skeleton";
import { Typography, Theme, makeStyles } from "@material-ui/core";
import { Styles, StyleRulesCallback } from "@material-ui/core/styles/withStyles";
import EmojiEmotionsIcon from '@material-ui/icons/EmojiEmotions';

export type Identity = {
    toDer(): ArrayBuffer
}

const styler: StyleRulesCallback<Theme, {}> = () => ({
    overflowBreakWords: {
        overflowWrap: 'break-word'
    }
})

/**
 * Simple Screen Layout for Authentication Screens.
 * This arranges the elements within the AuthenticationScreenLayout,
 *   at least for screens that all have a common, simple structure
 *   that includes Hero Image, Title, Body, Call To Action buttons.
 */
export default function (props: {
    /** href of page to go to when user clicks 'next' button */
    next: string;
    identity?: Identity
}) {
    const { identity } = props;
    return <>
        <div data-test-id="identity-confirmation-screen">
            <SimpleScreenLayout {...{
            HeroImage,
            Title,
            Body: () => <Body {...{identity}} />,
            CallToAction: () => <CallToAction nextHref={props.next} />
            }} />
        </div>
    </>
}

function CallToAction(props: {
    nextHref: string;
}) {
    return <>
        <Button role="button" data-test-id="cancel">Cancel</Button>
        <Button
            role="button"
            data-test-id="next"
            href={props.nextHref}
            variant="contained"
            color="primary"
        >
            Next
        </Button>
    </>
}

function Title() {
    return <>Your Profile Identity</>
}

function Body(props: {
    identity?: Identity
}) {
    const styles = makeStyles(styler)()
    const { identity } = props;
    return <>
        {
            identity
            ? <>
                <Typography variant="subtitle1" gutterBottom>Your profile address</Typography>
                <Typography gutterBottom>
                    <code className={styles.overflowBreakWords}>
                    {hexEncodeUintArray(new Uint8Array(identity.toDer()))}
                    </code>
                </Typography>
            </>
            : <>
                No identity set.
            </>
        }
    </>
}

function HeroImage() {
    return <>
        <EmojiEmotionsIcon style={{fontSize: '4em'}} />
        {/* <Skeleton variant="rect" height="10em" width="16.8em" animation={false} /> */}
    </>
}