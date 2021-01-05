import * as React from "react";
import { Button } from "../../../components/Button";
import { styled } from "@material-ui/core/styles"
import { Box, makeStyles, Typography } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";
import SimpleScreenLayout from "../layout/SimpleScreenLayout";

const styler = () => {
    return {
    }
}

export default function WelcomeScreen(props: {
    createProfile(): void;
}) {
    const styles = makeStyles(styler)();
    const { createProfile } = props;
    const onClickCreateProfile = React.useCallback(createProfile, [createProfile])
    return <SimpleScreenLayout {...{
        HeroImage,
        Title,
        Body,
        CallToAction: () => <CallToAction {...{onClickCreateProfile}} />
    }}
    />;
}

function CallToAction(props: {
    onClickCreateProfile(): void;
}) {
    return <>
    <Button variant="contained" color="primary" data-test-id="next" className="create-profile" role="button" onClick={props.onClickCreateProfile}>Create Profile</Button>
    </>
}
function Title() {
    return <>Getting Started</>
}

function Body() {
    return <Typography variant="body1" gutterBottom>
    Wos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum dele.
    </Typography>
}

function HeroImage() {
    const styles = makeStyles(styler)();
    return <>
        <Skeleton variant="rect" height="10em" width="16.8em" animation={false} />
    </>
}