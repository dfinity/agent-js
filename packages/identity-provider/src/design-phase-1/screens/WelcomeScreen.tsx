import * as React from "react";
import { Button } from "../../components/Button";
import { styled } from "@material-ui/core/styles"
import { Box, makeStyles, Typography } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";

const styler = () => {
    return {
        welcomeImage: {
            margin: '0 auto',
        }
    }
}

export default function WelcomeScreen(props: {
    createProfile(): void;
}) {
    const styles = makeStyles(styler)();
    const { createProfile } = props;
    const onClickCreateProfile = React.useCallback(createProfile, [createProfile])
    const Title: React.FunctionComponent = ({ children }) => {
        return <Typography variant="h1">{ children }</Typography>
    }
    return <>

        {/* Welcome Image  */}
        <section>
            <Skeleton className={styles.welcomeImage} variant="rect" height="10em" width="16.8em" animation={false} />
        </section>

        {/* Main Text */}
        <header>
            <Title>Getting Started</Title>
        </header>
        <Typography variant="body1">
        Wos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum dele.
        </Typography>

        {/* Call to Action Button */}
        <section>
            <Button variant="contained" color="primary" data-test-id="next" className="button create-profile" role="button" onClick={onClickCreateProfile}>Create Profile</Button>
        </section>
    </>
}
