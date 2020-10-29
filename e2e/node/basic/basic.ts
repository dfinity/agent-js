import { Actor, Principal, blobFromHex } from '@dfinity/agent';
import httpAgent from '../utils/agent';

test('cert', async () => {
  const principal = await Principal.fromHex('04');
  const cert = await httpAgent.readState({ paths: [[blobFromHex('time')]] }, principal);
  console.log(cert);
});
