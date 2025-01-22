import { $, cd, fetch } from 'zx';
import path from 'path';

const main = async () => {
  const res = await fetch(
    'https://raw.githubusercontent.com/dfinity/portal/refs/heads/master/docs/references/_attachments/ic.did',
  );
  res.text().then(async text => {
    const root = path.resolve(__dirname, '..');

    // TODO: remove this function once the bitcoin queries are removed from the candid spec
    const candid = stripBitcoinQueries(text);

    await cd(`${root}/packages/agent/src/canisters`);

    await $`echo ${candid} > management.did`;

    // Format the candid file
    await $`npx prettier --write --plugin=prettier-plugin-motoko **/*.did`;

    // Generate the idl and interface files
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
    ts = ts.replace(`export interface _SERVICE {`, `export default interface _SERVICE {`);
    js = js.replace(`export const idlFactory = ({ IDL }) => {`, `export default ({ IDL }) => {`);

    // remove init function
    js = js.split('export const init = ({ IDL }) => {')[0];

    ts = prefix + ts;
    js = prefix + js;

    // write the files
    await $`echo ${js} > management_idl.ts`;
    await $`echo ${ts} > management_service.ts`;

    await cd(`${root}`);

    // Format the generated files
    await $`npm run prettier:format`;

    console.log('Done!');
  });
};

function stripBitcoinQueries(text: string): string {
  // get_utxos_query
  let newText = text.replace(
    `type bitcoin_get_utxos_query_args = record {
    address : bitcoin_address;
    network : bitcoin_network;
    filter : opt variant {
        min_confirmations : nat32;
        page : blob;
    };
};`,
    '',
  );
  newText = newText.replace(
    `
type bitcoin_get_utxos_query_result = record {
    utxos : vec utxo;
    tip_block_hash : block_hash;
    tip_height : nat32;
    next_page : opt blob;
};`,
    '',
  );

  newText = newText.replace(
    `bitcoin_get_utxos_query : (bitcoin_get_utxos_query_args) -> (bitcoin_get_utxos_query_result) query;`,
    '',
  );

  //     bitcoin_get_balance_query
  newText = newText.replace(
    `bitcoin_get_balance_query : (bitcoin_get_balance_query_args) -> (bitcoin_get_balance_query_result) query;`,
    '',
  );

  newText = newText.replace(
    `
type bitcoin_get_balance_query_args = record {
    address : bitcoin_address;
    network : bitcoin_network;
    min_confirmations : opt nat32;
};`,
    '',
  );

  newText = newText.replace(
    `
type bitcoin_get_balance_query_result = satoshi;`,
    '',
  );

  return newText;
}

main();
