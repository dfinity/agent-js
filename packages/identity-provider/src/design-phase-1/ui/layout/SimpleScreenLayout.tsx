import * as React from "react";
import { Box, makeStyles, Typography, Grid } from "@material-ui/core";

const styler = () => ({
    heroImage: {
        display: 'inline-block',
        margin: '0 auto'
    },
    bodyText: {
    }
})

export default function SimpleScreenLayout(props: {
    HeroImage: React.ComponentType
    Title: React.ComponentType
    Body: React.ComponentType
    CallToAction: React.ComponentType
}) {
    const { Body, HeroImage, Title, CallToAction } = props;
    const styles = makeStyles(styler)()
    const Container: React.ComponentType = ({children}) => <>
        <Grid container justify="center" spacing={2}>{children}</Grid>
    </>
    const ContainerBlock: React.ComponentType = ({ children }) => <>
        <Grid item xs={12}>{ children }</Grid>
    </>
    return <>
        <Container>
            <ContainerBlock>
                <div className={styles.heroImage}><HeroImage /></div>
                <Typography variant="h2" gutterBottom>
                    <Title />
                </Typography>
                <Typography variant="body1" component="div">
                    <Body />
                </Typography>
            </ContainerBlock>

            <ContainerBlock>
                <CallToAction />
            </ContainerBlock>
        </Container>
    </>
}
