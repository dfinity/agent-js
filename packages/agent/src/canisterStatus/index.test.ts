import { canisterStatus } from './index';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { fromHexString } from '@dfinity/candid';
import { Identity } from '../auth';
import fetch from 'node-fetch';
const testPrincipal = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');

const testCases = [
  {
    certificate:
      'd9d9f7a2647472656583018301830183024863616e697374657283018301820458204c805d47bd74dbcd6c8ce23ebd2e8287c453895165db6b81d93f1daf1b12004683024a0000000000000001010183018301820458205a1ee5770842c74b6749f4d72e3c1b8c0dafdaff48e113d19da4fda687df0636830183024b636f6e74726f6c6c6572738203584dd9d9f7834a00000000000000000101581d888c23d36055424f2dc2e2fc6bb8a9956b24e86d024eb583d608172302581d9a1e6bf09022ffccbffa69fc8e083bb02d5079d48b3640c086b9bfb102820458203f5d5e50273338954bcfc10b92d92ab1e5acc4bb817c0be6f809538184bd92a682045820fe14201dac08b701acc5eaac0f5df0b59e28a2ad9c657c45884ed803ea2d14b1820458202d41b194a0931a274d874a4de945f104fbcf45de1bb201ec2bbdcb036c21fb0f82045820b7bfa75caf49ccbab490f8c512fbbb5add61590ae630c61028d4d49a212d6a8f820458204a6a7e397f0174c31751e1a90274fe9eb8619d980092433a64906afc048e60ee8301820458204ade10f35dce4ecb49dc653f1b7f8c308c2543e494582398b233f5f63156ed3b83024474696d65820349e8dad6e7b5d1fdf716697369676e61747572655830b228e6bdadb8a842782605070f7ad87295865e55465b81959024880115d4e5b12185ccef96d53ab54346df9bcb3ac7fd',
  },
];

const getStatus = async () => {
  const identity = (await Ed25519KeyIdentity.generate(
    new Uint8Array(
      fromHexString('foo23342sd-234-234a-asdf-asdf-asdf-4frsefrsdf-weafasdfe-easdfee'),
    ),
  )) as unknown as Identity;
  console.log(identity.getPrincipal().toText());

  return await canisterStatus({
    canisterId: testPrincipal,
    paths: ['Time', 'Controllers', 'ModuleHash'],
    agentOptions: {
      host: 'http://127.0.0.1:8000',
      identity,
      fetch,
    },
  });
};

describe('Canister Status utility', () => {
  it('should query the time', async () => {
    const status = await getStatus();

    expect(status.get('Time')).toBeTruthy();
  });
  it('should query canister controllers', async () => {
    const status = await getStatus();
    expect(status.get('Controllers')).toBeTruthy();
  });
  it('should query canister module hash', async () => {
    const status = await getStatus();
    expect(status.get('ModuleHash')).toBeTruthy();
  });
});
