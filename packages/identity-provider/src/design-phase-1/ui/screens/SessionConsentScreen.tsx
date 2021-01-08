import * as React from "react";
import { Button } from "src/components/Button";
import { hexEncodeUintArray } from "src/bytes";
import SimpleScreenLayout from "../layout/SimpleScreenLayout";
import { Typography, makeStyles, Divider, Theme, createStyles, styled } from "@material-ui/core";
import Skeleton from "@material-ui/lab/Skeleton";
import EnhancedEncryptionIcon from '@material-ui/icons/EnhancedEncryption';
import withStyles, { Styles, StyleRulesCallback } from "@material-ui/core/styles/withStyles";
import { Principal } from "@dfinity/agent";

interface IDerEncodable {
    toDer(): ArrayBuffer|undefined
}

export interface AuthenticationResponseConsentProposal {
    session: IDerEncodable;
    profile: { id: {hex: string}}
    scope: {
        canisters: Array<{ principal: Principal }>
    }
}

export default function (props: {
    consentProposal: AuthenticationResponseConsentProposal
    consent(): void
}) {
    const { consentProposal } = props
    return <>
        <div data-test-id="session-consent-screen">
            <SimpleScreenLayout {...{
                HeroImage,
                Title,
                Body: () =>
                    <Body {...{consentProposal}} />,
                CallToAction: () => <CallToAction consent={props.consent} />,
            }} />
        </div>
    </>
}

const styler = function() {
    return createStyles({
        consentTable: {
            '& th,td': {
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
    consent(): void;
}) {
    async function onClickAllow() {
        await props.consent();
    }
    return <>
        <Button role="button" data-test-id="deny-authorize-session">Deny</Button>
        <Button role="button" variant="outlined" color="primary" data-test-id="allow-authorize-session" onClick={onClickAllow}>Allow</Button>
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
    consentProposal: AuthenticationResponseConsentProposal
}) {
    const styles = makeStyles(styler)()
    const { consentProposal } = props;
    const { session } = consentProposal;
    const sessionDerHex: string|undefined = React.useMemo(
        () => {
            const der = session.toDer()
            if (!der) return;
            const hex = hexEncodeUintArray(new Uint8Array(der));
            return hex;
        },
        [session]
    )
    return <>
        <Typography variant="subtitle1" gutterBottom>
            You have chosen to Sign In with
        </Typography>
        <Typography component="div" gutterBottom>
            <table className={styles.consentTable}>
                <tbody>
                    <tr>
                        <th scope="row">Profile ID</th>
                        <td>
                            <HexFormatter hex={consentProposal.profile.id.hex} />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Session ID</th>
                        <td>
                            {
                            sessionDerHex
                            ? <HexFormatter hex={sessionDerHex} />
                            : "(not set)"
                            }
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Canisters</th>
                        <td>
                            <ul>
                                {props.consentProposal.scope.canisters.map(({principal}, i) => {
                                    return <li key={i}>{principal.toText()}</li>
                                })}
                            </ul>
                        </td>
                    </tr>
                </tbody>
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