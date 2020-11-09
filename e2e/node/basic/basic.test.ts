import { Actor, Principal, blobFromText, Certificate, getManagementCanister } from "@dfinity/agent";
import httpAgent, { principal } from '../utils/agent';

test('time', async () => {
  const path = [blobFromText('time')];
  // const principal = await Principal.anonymous();
  const response = await httpAgent.readState({ paths: [path] }, principal);
  const cert = new Certificate(response);
  expect(await cert.verify()).toBe(true);
  const time = cert.lookup(path);
  // console.log(time);
});

test("createCanister", async () => {
  // Make sure this doesn't fail.
  await getManagementCanister({}).create_canister();
});
