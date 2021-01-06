import * as React from "react";
import { Button } from "src/components/Button";
import { hexEncodeUintArray } from "src/bytes";
import SimpleScreenLayout from "../layout/SimpleScreenLayout";
import { Typography, makeStyles, Divider, Theme, createStyles, styled } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";
import EnhancedEncryptionIcon from '@material-ui/icons/EnhancedEncryption';
import withStyles, { Styles, StyleRulesCallback } from "@material-ui/core/styles/withStyles";

interface IDerEncodable {
    toDer(): ArrayBuffer|undefined
}

export default function (props: {
    next: string;
    session: IDerEncodable;
    profile: { id: {hex: string}}
}) {
    const { next } = props

    return <>
        <div data-test-id="session-consent-screen">
            <SimpleScreenLayout {...{
                HeroImage,
                Title,
                Body: () => <Body session={props.session} profile={props.profile} />,
                CallToAction: () => <CallToAction nextHref={next} />,
            }} />
        </div>
    </>
}

const styler = function() {
    return createStyles({
        consentTable: {
            padding: '0 5em',
            '& td': {
                textAlign: 'left',
                overflowWrap: 'anywhere',
                '&:first-child': {
                    fontWeight: 'bold',
                    textAlign: 'right',
                    overflowWrap: 'initial'
                },
                verticalAlign: 'top',
                paddingRight: '1em',
                overflow: 'hidden',
                '& ul': {
                    marginTop: 'inherit',
                    marginBottom: 'inherit',
                    paddingLeft: 0,
                    listStylePosition: 'inside',
                }
            }
        },
        wrapTextAnywhere: {
            overflowWrap: 'anywhere',
        },
    })
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

function HexFormatter(props: {
    hex: string
}) {
    const { hex } = props;
    const numChars = props.hex.length;
    const numLines = 2;
    const firstLineLength = Math.ceil(numChars / numLines)
    const lines = [];
    for (let i=0; i<hex.length; i+=firstLineLength) {
        lines.push(hex.slice(i, i+firstLineLength))
        // encourage a line break here
        // lines.push(<wbr />)
    }
    return <>
    {lines}
    </>
}

function Body(props: {
    profile: {
        id: {
            hex: string
        }
    }
    session: IDerEncodable
}) {
    const styles = makeStyles(styler)()
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
        <Typography variant="subtitle1" gutterBottom>
            You have chosen to Sign In with
        </Typography>
        <Typography component="div" gutterBottom>
            <table className={styles.consentTable}>
                <tr>
                    <td>Profile ID</td>
                    <td>
                        <HexFormatter hex={props.profile.id.hex} />
                    </td>
                </tr>
                <tr>
                    <td>Session ID</td>
                    <td>
                        {
                        sessionDerHex
                        ? <HexFormatter hex={sessionDerHex} />
                        : "(not set)"
                        }
                    </td>
                </tr>
                <tr>
                    <td>Canisters</td>
                    <td>
                        <ul>
                            <li>Canister A</li>
                            <li>Canister B</li>
                            <li>
                                #TODO(bengo): ic-idp protocol needs to support RP requesting 1-2 canisters as 'targets', then those IDs can be shown here.
                            </li>
                        </ul>
                    </td>
                </tr>
            </table>
        </Typography>
        <br />
        <Warning>
            <Typography>
                Do you authorize this session to act as your chosen Profile when interacting with the canisters?
            </Typography>
        </Warning>
    </>
}

function Warning(props: { children: React.ReactNode}) {
    const StyledWarning = styled('div')({
        color: '#856404',
        backgroundColor: '#fff3cd',
        borderColor: '#ffeeba',
        padding: '0.75em 1.25em',
        border: '1px solid transparent',
        borderRadius: '0.25em',
    });
    return <StyledWarning>{props.children}</StyledWarning>
}

function HeroImage() {
    const styles = makeStyles(styler)();
    return <>
        <EnhancedEncryptionIcon style={{fontSize: '4em'}} />
    </>
}