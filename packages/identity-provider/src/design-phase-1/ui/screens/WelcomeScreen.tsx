import * as React from "react";
import { Button } from "../../../components/Button";
import { styled } from "@material-ui/core/styles"
import { Box, makeStyles, Typography } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";
import SimpleScreenLayout from "../layout/SimpleScreenLayout";
import LockIcon from '@material-ui/icons/Lock';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import { SignIdentity } from "@dfinity/agent";
import { hexEncodeUintArray } from "src/bytes";
import { Ed25519KeyIdentity, WebAuthnIdentity } from "@dfinity/authentication";

const styler = () => {
    return {
    }
}

export default function WelcomeScreen(props: {
    identity: undefined|Ed25519KeyIdentity|WebAuthnIdentity;
    useIdentity(identity: Ed25519KeyIdentity|WebAuthnIdentity): void;
    createProfile(): void;
}) {
    const styles = makeStyles(styler)();
    const { createProfile, useIdentity } = props;
    const onClickCreateProfile = React.useCallback(createProfile, [createProfile])
    return <SimpleScreenLayout {...{
        HeroImage,
        Title,
        Body: () => <Body identity={props.identity} />,
        CallToAction: () => <CallToAction {...{onClickCreateProfile, ...props}} />
    }}
    />;
}

function CallToAction(props: {
    onClickCreateProfile(): void;
    identity: Ed25519KeyIdentity|WebAuthnIdentity|undefined;
    useIdentity(identity: SignIdentity): void;
}) {
    const { identity } = props;
    const existingIdentityString = React.useMemo(
        () => {
            if ( ! identity) return;
            return hexEncodeUintArray(identity.getPublicKey().toDer())
        },
        [identity]
    )
    const ContinueButtonText = styled('div')({
        maxWidth: '20em',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    })
    const primaryButtonProps: Partial<React.ComponentProps<typeof Button>> = {
        variant: "contained",
        color: "primary",
    }
    return <>
        <Button
            {...(identity ? {} : primaryButtonProps)}
            data-test-id="next"
            className="create-profile"
            role="button"
            onClick={props.onClickCreateProfile}>
            Create Profile
        </Button>
        {identity && <>
            <Button {...primaryButtonProps}
                onClick={() => props.useIdentity(identity)}
                data-test-id="continue-with-profile">
                Continue as&nbsp;
                <ContinueButtonText>
                    <span>{existingIdentityString}</span>
                </ContinueButtonText>
            </Button>
        </>}
    </>
}
function Title() {
    return <>Getting Started</>
}

function Body(props: {
    identity?: SignIdentity
}) {
    const { identity } = props;
    return <>
        <Typography variant="body1" paragraph>
        Create a Profile to use this <a target="_blank" href="https://internetcomputer.org">Internet Computer</a> Canister.
        </Typography>
        {identity && <>
            <Typography variant="body1" paragraph>
            Or use your existing Profile to continue Authenticating.
            </Typography>
        </>}
    </>
}

function HeroImage() {
    const styles = makeStyles(styler)();
    return <>
        <LockIcon style={{fontSize: '4em'}} />
    </>;
}