import { Actor, Principal, blobFromText } from '@dfinity/agent';
import httpAgent, { principal } from '../utils/agent';

test('time', async () => {
  const principal = await Principal.fromHex('04');
  const cert = await httpAgent.readState({ paths: [[blobFromText('time')]] }, principal);
  console.log(cert);
});
