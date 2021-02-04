import * as React from "react";
import { makeStyles, Typography, Grid, styled } from "@material-ui/core";

const styler = () => ({
    heroImage: {
        display: 'inline-block',
        margin: '0 auto'
    },
    bodyText: {
    }
})

/**
 * Common Layout component for design-phase-1 UI Screens (where it makes sense).
 * @param props props
 * @param props.HeroImage - component to render along the top as an overview image
 * @param props.Title - title of screen
 * @param props.Body - main screen content
 * @param props.CallToAction - contains buttons along the bottom
 */
export default function SimpleScreenLayout(props: {
    HeroImage: React.ComponentType
    Title: React.ComponentType
    Body: React.ComponentType
    CallToAction: React.ComponentType
}): JSX.Element {
    const { Body, HeroImage, Title, CallToAction } = props;
    const styles = makeStyles(styler)()
    const Container: React.ComponentType = ({children}) => <>
        <Grid container justify="center" spacing={2}>{children}</Grid>
    </>
    const ContainerBlock: React.ComponentType = ({ children }) => <>
        <Grid item xs={12}>{ children }</Grid>
    </>
    const BodyPadder = styled('div')({
        maxWidth: '80%',
        margin: '0 auto',
    })
    return <>
        <Container>
            <ContainerBlock>
                <div className={styles.heroImage}><HeroImage /></div>
                <Typography variant="h2" gutterBottom data-test-id="title">
                    <Title />
                </Typography>
                
                <BodyPadder>
                    <Typography variant="body1" component="div">
                        <Body />
                    </Typography>
                </BodyPadder>

            </ContainerBlock>

            <ContainerBlock>
                <CallToAction />
            </ContainerBlock>
        </Container>
    </>
}
