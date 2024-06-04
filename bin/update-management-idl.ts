import { $, cd, fetch } from 'zx';
import path from 'path';

fetch(
  'https://raw.githubusercontent.com/dfinity/interface-spec/master/spec/_attachments/ic.did',
).then(async res => {
  res.text().then(async text => {
    const root = path.resolve(__dirname, '..');

    const candid = text;

    await cd(`${root}/packages/agent/src/canisters`);

    await $`echo ${candid} > management.did`;
    let ts = (await $`didc bind management.did -t ts`).toString();
    let js = (await $`didc bind management.did -t js`).toString();

    const didcVersion = await $`didc --version`;

    const prefix = `/*
 * This file is generated from the candid for asset management.
 * didc version: ${didcVersion.toString().split(' ')[1].trim()}
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore

`;

    // replace first line of service

    ts.replace(`export interface _SERVICE {`, `export default interface _SERVICE {`);
    js.replace(`export const idlFactory = ({ IDL }) => {`, `export default ({ IDL }) => {`);

    ts = prefix + ts;
    js = prefix + js;

    await $`echo ${js} > management_idl.ts`;
    await $`echo ${ts} > management_service.ts`;

    await cd(`${root}`);

    await $`npm run prettier:format`;

    console.log('Done!');
  });
});
