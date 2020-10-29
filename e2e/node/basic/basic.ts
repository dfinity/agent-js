import { Actor, Principal, blobFromText, Certificate } from '@dfinity/agent';
import httpAgent, { principal } from '../utils/agent';
import { Buffer } from 'buffer/';

test('time', async () => {
  const principal = await Principal.fromHex('04');
  const response = await httpAgent.readState({ paths: [[blobFromText('time')]] }, principal);
  const cert = new Certificate(response);
  console.log(cert);
  console.log(cert.lookup([Buffer.from('time')]));
  throw new Error('false');
});
