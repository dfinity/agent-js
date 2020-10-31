import { Actor, Principal, blobFromText, Certificate, getManagementCanister, verify } from '@dfinity/agent';
import httpAgent, { principal } from '../utils/agent';
import { Buffer } from 'buffer/';

test('time', async () => {
  const path = [blobFromText('time')];
  const principal = await Principal.fromHex('04');
  const response = await httpAgent.readState({ paths: [path] }, principal);
  const cert = new Certificate(response);
  const time = cert.lookup(path);
  //console.log(time);
  const tree = cert.getTree();
  await verify(tree);
});

/*
test('createCanister', async () => {
  const cid = await getManagementCanister({}).create_canister();
  console.log(cid.canister_id.toText());
});
*/
