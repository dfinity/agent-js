import * as React from "react";
import Paper from "@material-ui/core/Paper";
import { styled } from "@material-ui/core/styles"
import { Grid } from "@material-ui/core";

// Wrapper of whole 'layout'. Pad. White bg.
const PaddedPaper = styled(Paper)({
    padding: '1em'
})

const MinHeightViewportHeight = styled('div')({
    minHeight: '100vh',
})

const Container: React.FunctionComponent = ({ children }) => {
    const Margin = styled('div')({ margin: '1em' })
    const CenterText = styled('div')({ textAlign: 'center' })
    return <>
    <MinHeightViewportHeight>
    <Grid container
              direction="column"
              justify="center"
              >
            <Grid item xs={12}>
                <Margin>
                    <CenterText>
                        {children}
                    </CenterText>
                </Margin>
            </Grid>
        </Grid>
    </MinHeightViewportHeight>

    </>
}

export default function AuthenticationScreenLayout (props: {
    children: React.ReactNode
}) {
    return <>
    <Container>
        <PaddedPaper>        
            <div>{props.children}</div>
        </PaddedPaper>
    </Container>

    </>
}
