import * as React from "react";
import { Button } from "src/components/Button";
import { hexEncodeUintArray } from "src/bytes";
import SimpleScreenLayout from "../layout/SimpleScreenLayout";
import { Typography, Theme, makeStyles } from "@material-ui/core";
import { StyleRulesCallback } from "@material-ui/core/styles/withStyles";
import EmojiEmotionsIcon from '@material-ui/icons/EmojiEmotions';

export type Identity = {
    toDer(): ArrayBuffer
}

const styler: StyleRulesCallback<Theme, Record<string,unknown>> = () => ({
    overflowBreakWords: {
        overflowWrap: 'break-word'
    }
})

/**
 * Screen that shows the end-user the identity they've selected so they can confirm their choice.
 * @param props props
 * @param props.next - href of URL to go to next after clicking the main CallToAction
 * @param props.identity - Identity chosen by the end-user that we want them to confirm.
 */
export default function (props: {
    /** href of page to go to when user clicks 'next' button */
    next: string;
    identity?: Identity
}): JSX.Element {
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
    return <>Your Profile</>
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
                <Typography variant="subtitle1" gutterBottom>Profile ID</Typography>
                <Typography paragraph>
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