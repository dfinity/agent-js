import { CallConfig, Cbor, HttpAgent, lookup_path, ReadStateOptions } from '..';
import { Principal } from '@dfinity/principal';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { getManagementCanister } from './management';

import fetch from 'node-fetch';
import { fromHexString, PipeArrayBuffer, toHexString } from '@dfinity/candid/lib/cjs/utils/buffer';
import { Certificate } from '../';
import { IDL, lebDecode } from '@dfinity/candid';
import { CborTag } from 'src/cbor';

const identity = Ed25519KeyIdentity.generate(
  new Uint8Array(fromHexString('foo23342sd-234-234a-asdf-asdf-asdf-4frsefrsdf-weafasdfe-easdfee')),
);

const fakeFetch = (x: any, y: any, z: any) => {
  console.log(JSON.stringify(x));
  console.log(JSON.stringify(y));
};

const agent = new HttpAgent({ fetch, host: 'http://127.0.0.1:8000', identity });
agent.fetchRootKey();

const princ = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');

const paths = ['time'].map(str => [new TextEncoder().encode(str).buffer]);

const controllersPath = [
  new TextEncoder().encode('canister').buffer,
  princ.toUint8Array().buffer,
  new TextEncoder().encode('controllers').buffer,
];
const modulePath = [
  new TextEncoder().encode('canister').buffer,
  princ.toUint8Array().buffer,
  new TextEncoder().encode('controllers').buffer,
];

paths.push(controllersPath);
paths.push(modulePath);

identity.getPrincipal().toText(); //?

const options: ReadStateOptions = {
  paths,
};
const response = agent.readState(princ, options);

const decode = (buf: ArrayBuffer) => {
  return lebDecode(new PipeArrayBuffer(buf));
};

response;
response
  .then(async resolved => {
    resolved; //?
    toHexString(resolved.certificate); //?
    Object.keys(resolved); //?
    const cert = new Certificate(resolved, agent);

    await cert.verify();

    await setImmediate(() => {
      Promise.resolve();
    });

    const time = cert.lookup(['time']); //?
    const controllers = cert.lookup(controllersPath) as ArrayBuffer; //?

    const controller = new DataView(controllers); //?
    controller.byteLength; //?

    const principal1 = Principal.fromUint8Array(
      new Uint8Array(Cbor.decode(controllers)[2]),
    ).toText(); //?

    lebDecode(new PipeArrayBuffer(time)); //?
  })
  .catch(err => {
    console.error(err);
  });

// managementCanister.canister_status({ canister_id: princ }); //?
