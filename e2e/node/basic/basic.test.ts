import { Actor, Principal, blobFromText, Certificate, getManagementCanister, IDL } from "@dfinity/agent";
import httpAgent from '../utils/agent';
import { Buffer } from 'buffer/';

test('read_state', async () => {
  const now = Date.now()/1000;
  const path = [blobFromText('time')];
  const response = await httpAgent.readState({ paths: [path] });
  const cert = new Certificate(response);
  
  expect(() => cert.lookup(path)).toThrow(/Cannot lookup unverified certificate/);
  expect(await cert.verify()).toBe(true);
  expect(cert.lookup([blobFromText('Time')])).toBe(undefined);
  const rawTime = cert.lookup(path)!;
  const decoded = IDL.decode([IDL.Nat], Buffer.concat([Buffer.from('DIDL\x00\x01\x7d'), rawTime]))[0];
  const time = (decoded as any).toNumber()/1e9;
  // The diff between decoded time and local time is within 5s
  expect(Math.abs(time - now) < 5).toBe(true);
});

test("createCanister", async () => {
  // Make sure this doesn't fail.
  await getManagementCanister({}).create_canister();
});
