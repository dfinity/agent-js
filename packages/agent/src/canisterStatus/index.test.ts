import { canisterStatus, Path } from './index';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { fromHexString } from '@dfinity/candid';
import { Identity } from '../auth';
import fetch from 'node-fetch';
import { HttpAgent } from '../agent';
import { fromHex } from '../utils/buffer';

const testPrincipal = Principal.fromText('renrk-eyaaa-aaaaa-aaada-cai');

// Utils
const encoder = new TextEncoder();
const encode = (arg: string): ArrayBuffer => {
  return new DataView(encoder.encode(arg).buffer).buffer;
};
const canisterBuffer = new DataView(testPrincipal.toUint8Array().buffer).buffer;

/* Produced by deploying a dfx new canister and requesting
  | 'Time'
  | 'Controllers'
  | 'Subnet'
  | 'ModuleHash'
  | 'Candid'
  in dfx 0.10.0
  */
const testCases = [
  {
    certificate:
      'd9d9f7a2647472656583018301830183024863616e697374657283018204582062d8435a90c86cad23c5ad3308b3a28b0b4ffa22d98d1621ada32e31d535ae488301820458200394d885dc895f6c2edd0c1a81ed025394932e74edbf6897f4b82a374b2fc1e683024a0000000000000006010183018301820458205a1ee5770842c74b6749f4d72e3c1b8c0dafdaff48e113d19da4fda687df0636830183024b636f6e74726f6c6c6572738203582ed9d9f7824a00000000000000030101581d9a1e6bf09022ffccbffa69fc8e083bb02d5079d48b3640c086b9bfb1028302486d657461646174618301830182045820e8071e9c904063629f9ab66d4a447b7a881a964d16757762f424d2ef6c6a776b83024e63616e6469643a736572766963658203584774797065204578616d706c65203d20746578743b0a73657276696365203a207b0a202067726565743a20284578616d706c6529202d3e202874657874292071756572793b0a7d0a820458203676da3cc701ead8143596204d845c31a11d483dccffd5f80e5530660322212883024b6d6f64756c655f6861736882035820896f6c079f96bc3cbef782af1ab1b52847f04700ff916eb49425566995a9a06482045820569fc1732a4b18190ce69dbc0dd099e058ab8a0759d13912d9b35bc285e6a51b82045820f5950b2e68705abf76ae6fedf7cf853a2bd4e62cc68bab9288d4af39befabbc9830182045820bc99716f607cfe2a969782ff6cf90bcdb80708b8cf4de5bf526eefc3a9bfb70c83024474696d65820349d0f4dfc0eedb95f816697369676e61747572655830b2bc8d6ecb68d2b50b86df8f897c1c5b2999746fb8fd1bed1d1539135e9eace3eb3234a19c4e22e51ffbb1237e35bc1b',
  },
];

// Used for repopulating the certificate
const getRealStatus = async (paths: Path[]) => {
  const identity = (await Ed25519KeyIdentity.generate(
    new Uint8Array(
      fromHexString('foo23342sd-234-234a-asdf-asdf-asdf-4frsefrsdf-weafasdfe-easdfee'),
    ),
  )) as unknown as Identity;

  return await canisterStatus({
    canisterId: testPrincipal,
    paths,
    agentOptions: { host: 'http://127.0.0.1:8000', fetch, identity },
  });
};

// Mocked status using precomputed certificate
const getStatus = async (paths: Path[]) => {
  const agent = new HttpAgent({ host: 'http://127.0.0.1:8000' });
  await agent.fetchRootKey();

  agent.readState = jest.fn(() =>
    Promise.resolve({ certificate: fromHex(testCases[0].certificate) }),
  );

  return await canisterStatus({
    canisterId: testPrincipal,
    // Note: Subnet is not currently working due to a bug
    paths,
    agent,
  });
};

describe('Canister Status utility', () => {
  it('should query the time', async () => {
    const status = await getStatus(['Time']);
    expect(status.get('Time')).toStrictEqual(new Date('2022-05-18T23:29:38.621Z'));
  });
  it('should query canister controllers', async () => {
    const status = await getStatus(['Controllers']);
    expect(status.get('Controllers')).toBeTruthy();
  });
  it('should query canister module hash', async () => {
    const status = await getStatus(['ModuleHash']);
    expect(status.get('ModuleHash')).toBeTruthy();
  });
  it('should query the candid interface', async () => {
    const status = await getStatus(['Candid']);
    status.get('Candid');
  });
  it('should support valid custom paths', async () => {
    const status = await getStatus([
      {
        key: 'Time',
        path: [new DataView(new TextEncoder().encode('time').buffer).buffer],
        decodeStrategy: 'leb128',
      },
    ]);
    const statusRaw = await getStatus([
      {
        key: 'Time',
        path: [new DataView(new TextEncoder().encode('time').buffer).buffer],
        decodeStrategy: 'raw',
      },
    ]);
    const statusHex = await getStatus([
      {
        key: 'Time',
        path: [new DataView(new TextEncoder().encode('time').buffer).buffer],
        decodeStrategy: 'hex',
      },
    ]);
    const statusCBOR = await getStatus([
      {
        key: 'Controller',
        path: [encode('canister'), canisterBuffer, encode('controllers')],
        decodeStrategy: 'cbor',
      },
    ]);
    expect(status.get('Time')).toBeTruthy();
    expect(statusRaw.get('Time')).toBeTruthy();
    expect(statusHex.get('Time')).toBeTruthy();
    expect(statusCBOR.get('Controller')).toBeTruthy();
  });
  it('should support valid metadata queries', async () => {
    const status = await getStatus([
      {
        kind: 'medadata',
        path: 'candid:service',
        key: 'candid',
        decodeStrategy: 'hex',
      },
    ]);
    const statusEncoded = await getStatus([
      {
        kind: 'medadata',
        path: encode('candid:service'),
        key: 'candid',
        decodeStrategy: 'hex',
      },
    ]);
    expect(status.get('candid')).toBeTruthy();
    expect(statusEncoded.get('candid')).toBeTruthy();
  });
  it('should support multiple requests', async () => {
    const status = await getStatus(['Time', 'Controllers']);
    expect(status.get('Time')).toBeTruthy();
    expect(status.get('Controllers')).toBeTruthy();
  });
  it('should support multiple requests with a failure', async () => {
    // Deliberately requesting a bad value
    const consoleSpy = jest.spyOn(console, 'warn');
    const status = await getStatus([
      'Time',
      // Subnet and this arbitrary path should fail
      'Subnet',
      {
        key: 'asdf',
        path: [new DataView(new TextEncoder().encode('asdf').buffer).buffer],
        decodeStrategy: 'hex',
      },
    ]);
    expect(status.get('Time')).toBeTruthy();
    // Expect null for a failed result
    expect(status.get('asdf' as unknown as Path)).toBe(null);
    // Expect undefined for unset value
    expect(status.get('test123')).toBe(undefined);
    expect(consoleSpy).toBeCalledTimes(2);
  });
});
