import { request, Path, encodePath, fetchNodeKeys } from './index';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { fromHexString } from '@dfinity/candid';
import { Identity } from '../auth';
import fetch from 'isomorphic-fetch';
import { HttpAgent } from '../agent';
import { fromHex, toHex } from '../utils/buffer';
import * as Cert from '../certificate';
import { goldenCertificates } from '../agent/http/__certificates__/goldenCertificates.test';

const IC_ROOT_KEY =
  '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100814' +
  'c0e6ec71fab583b08bd81373c255c3c371b2e84863c98a4f1e08b74235d14fb5d9c0cd546d968' +
  '5f913a0c0b2cc5341583bf4b4392e467db96d65b9bb4cb717112f8472e0d5a4d14505ffd7484' +
  'b01291091c5f87b98883463f98091a0baaae';
const testPrincipal = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');

// bypass bls verification so that an old certificate is accepted
jest.mock('../utils/bls', () => {
  return {
    blsVerify: jest.fn(() => Promise.resolve(true)),
  };
});

jest.useFakeTimers();
const certificateTime = Date.parse('2022-05-19T20:58:22.596Z');
jest.setSystemTime(certificateTime);

// Utils
const encoder = new TextEncoder();
const encode = (arg: string): ArrayBuffer => {
  return new DataView(encoder.encode(arg).buffer).buffer;
};
const canisterBuffer = new DataView(testPrincipal.toUint8Array().buffer).buffer;

/* Produced by deploying a dfx new canister and requesting
  | 'time'
  | 'controllers'
  | 'subnet'
  | 'moduleHash'
  | 'candid'
  in dfx 0.10.0
  */
const testCases = [
  {
    certificate:
      'd9d9f7a2647472656583018301830183024863616e697374657283018301820458204c805d47bd74dbcd6c8ce23ebd2e8287c453895165db6b81d93f1daf1b12004683024a0000000000000001010183018301820458205a1ee5770842c74b6749f4d72e3c1b8c0dafdaff48e113d19da4fda687df0636830183024b636f6e74726f6c6c657273820351d9d9f78241044a000000000000000001018302486d657461646174618301830182045820e8071e9c904063629f9ab66d4a447b7a881a964d16757762f424d2ef6c6a776b83024e63616e6469643a736572766963658203584774797065204578616d706c65203d20746578743b0a73657276696365203a207b0a202067726565743a20284578616d706c6529202d3e202874657874292071756572793b0a7d0a820458203676da3cc701ead8143596204d845c31a11d483dccffd5f80e5530660322212883024b6d6f64756c655f6861736882035820896f6c079f96bc3cbef782af1ab1b52847f04700ff916eb49425566995a9a064820458202d41b194a0931a274d874a4de945f104fbcf45de1bb201ec2bbdcb036c21fb0f82045820aa2f527164a8e4d898febf2bc0a8a4f95da58c3b62c6e4185e610e7b40dc615082045820fa572fdf7872444dba23377a8a426906c4314a61ef470df0af1b173b13abe949830182045820ec68f8bfb2a3f70cf8d3d427ff595e6ddb5d4230a8c3ca1d3ccb06e7694fd83283024474696d6582034980f485e1a4a6a7f816697369676e61747572655830adbb57f847e2656f248d3eec467af3c89eb5c63fa8d56bd3a3f48e3f3c570e50d0f824502fc69772d0d637190c52e4e4',
  },
];

// Used for repopulating the certificate
const getRealStatus = async () => {
  const identity = (await Ed25519KeyIdentity.generate(
    new Uint8Array(
      fromHexString('foo23342sd-234-234a-asdf-asdf-asdf-4frsefrsdf-weafasdfe-easdfee'),
    ),
  )) as unknown as Identity;

  const agent = new HttpAgent({ host: 'http://127.0.0.1:4943', fetch, identity });
  await agent.fetchRootKey();
  const canisterBuffer = new DataView(testPrincipal.toUint8Array().buffer).buffer;
  canisterBuffer;
  const response = await agent.readState(
    testPrincipal,
    // Note: subnet is not currently working due to a bug
    {
      paths: [
        encodePath('time', testPrincipal),
        [encode('canister'), canisterBuffer, encode('controllers')],
        [encode('canister'), canisterBuffer, encode('module_hash')],
        encodePath('candid', testPrincipal),
      ],
    },
    identity,
  );
  console.log(toHex(response.certificate));
};

// Mocked status using precomputed certificate
const getStatus = async (paths: Path[]) => {
  const agent = new HttpAgent({ host: 'https://ic0.app' });
  agent.readState = jest.fn(() =>
    Promise.resolve({ certificate: fromHex(testCases[0].certificate) }),
  );

  return await request({
    canisterId: testPrincipal,
    // Note: subnet is not currently working due to a bug
    paths,
    agent,
  });
};

describe('Canister Status utility', () => {
  it('should query the time', async () => {
    const status = await getStatus(['time']);
    expect(status.get('time')).toMatchSnapshot();
  });
  it('should query canister controllers', async () => {
    const status = await getStatus(['controllers']);
    expect(status.get('controllers')).toMatchSnapshot();
  });
  it('should query canister module hash', async () => {
    const status = await getStatus(['module_hash']);
    expect(status.get('module_hash')).toMatchSnapshot();
  });
  it('should query the candid interface', async () => {
    const status = await getStatus(['candid']);
    expect(status.get('candid')).toMatchSnapshot();
  });
  it('should support valid custom paths', async () => {
    const status = await getStatus([
      {
        key: 'time',
        path: [new DataView(new TextEncoder().encode('time').buffer).buffer],
        decodeStrategy: 'leb128',
      },
    ]);
    const statusRaw = await getStatus([
      {
        key: 'time',
        path: [new DataView(new TextEncoder().encode('time').buffer).buffer],
        decodeStrategy: 'raw',
      },
    ]);
    const statusUTF8 = await getStatus([
      {
        kind: 'metadata',
        path: 'candid:service',
        key: 'candid',
        decodeStrategy: 'utf-8',
      },
    ]);
    const statusHex = await getStatus([
      {
        key: 'time',
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
    expect(status.get('time')).toMatchSnapshot();
    expect(statusRaw.get('time')).toMatchSnapshot();
    expect(statusUTF8.get('candid')).toMatchSnapshot();
    expect(statusHex.get('time')).toMatchSnapshot();
    expect(statusCBOR.get('Controller')).toMatchSnapshot();
  });
  it('should support valid metadata queries', async () => {
    const status = await getStatus([
      {
        kind: 'metadata',
        path: 'candid:service',
        key: 'candid',
        decodeStrategy: 'hex',
      },
    ]);
    const statusEncoded = await getStatus([
      {
        kind: 'metadata',
        path: encode('candid:service'),
        key: 'candid',
        decodeStrategy: 'hex',
      },
    ]);
    expect(status.get('candid')).toMatchSnapshot();
    expect(statusEncoded.get('candid')).toMatchSnapshot();
  });
  it('should support multiple requests', async () => {
    const status = await getStatus(['time', 'controllers']);
    expect(status.get('time')).toMatchSnapshot();
    expect(status.get('controllers')).toMatchSnapshot();
  });
  it('should support multiple requests with a failure', async () => {
    // Deliberately requesting a bad value
    const consoleSpy = jest.spyOn(console, 'warn');
    const status = await getStatus([
      'time',
      // subnet and this arbitrary path should fail
      'subnet',
      {
        key: 'asdf',
        path: [new DataView(new TextEncoder().encode('asdf').buffer).buffer],
        decodeStrategy: 'hex',
      },
    ]);
    expect(status.get('time')).toMatchSnapshot();
    // Expect null for a failed result
    expect(status.get('asdf' as unknown as Path)).toBe(null);
    // Expect undefined for unset value
    expect(status.get('test123')).toBe(undefined);
    expect(consoleSpy).toBeCalledTimes(3);
  });
});

describe('node keys', () => {
  it('should return the node keys from a mainnet application subnet certificate', async () => {
    const { mainnetApplication } = goldenCertificates;
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.parse('2023-09-27T19:38:58.129Z')));
    const cert = await Cert.Certificate.create({
      certificate: fromHex(mainnetApplication),
      canisterId: Principal.fromText('erxue-5aaaa-aaaab-qaagq-cai'),
      rootKey: fromHex(IC_ROOT_KEY),
    });

    const nodeKeys = fetchNodeKeys(fromHex(mainnetApplication), fromHex(IC_ROOT_KEY));
    expect(nodeKeys).toMatchInlineSnapshot(`
      Object {
        "nodeKeys": Array [
          "302a300506032b65700321005b0bdf0329932ab0a78fa7192ad76cf37d67eb2024739774d3b67da7799ebc9c",
          "302a300506032b65700321009776d25542873dafb8099303d1fca8e4aa344e73cf5a3d7df5b40f9c8ed5a085",
          "302a300506032b6570032100e5a9296571826cc3be977490296405ae9da1da7d59cce1642421bc19804cc310",
          "302a300506032b6570032100b761a93e418ab326d2d106d9137268d407f7c8a743127e2833899933337eb09b",
          "302a300506032b6570032100afd56377478dc711cbfe043022423d9f7f7decb709de7501545923274186883f",
          "302a300506032b6570032100ce76939540cac8de3475329517c684e0562fb6cbad1db67fb60362808bdaf462",
          "302a300506032b65700321001645a7cb7f3980dd6f9ca6ca0966a4d4bde9d57d90df0f10fc31eac960a8ab41",
          "302a300506032b65700321000c441fada59fea1cf21ebc157392338ca56775011c4c5630782823e2a7938c8f",
          "302a300506032b6570032100f408b362fc92255a4776666179eba4b9dfbd6d3b9f6b87b3abb80f726878e0a9",
          "302a300506032b6570032100cab5efd3205fa4b3409b6f5e421ebd776dd36ea6108820c624478016df9c6a20",
          "302a300506032b6570032100e650a1cc4bf264cdc80442d33d7bd00e3de1f15ddd48c7ac0f2fe582f599d954",
          "302a300506032b6570032100be0759d30172a9dfdcc2e11b92e8daf1753c45f126b8413c8e57e621b5626d37",
          "302a300506032b65700321006b8ef72b0efb4ef38dc957097cb26dfcf24b083dd6b2b5fcd5269657cd8e59a7",
        ],
        "subnetId": "pae4o-o6dxf-xki7q-ezclx-znyd6-fnk6w-vkv5z-5lfwh-xym2i-otrrw-fqe",
      }
    `);
  });

  it('should return the node keys from a mainnet system subnet certificate', async () => {
    const { mainnetSystem } = goldenCertificates;
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.parse('2023-09-27T19:58:19.412Z')));
    const cert = await Cert.Certificate.create({
      certificate: fromHex(mainnetSystem),
      canisterId: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
      rootKey: fromHex(IC_ROOT_KEY),
    });

    const nodeKeys = fetchNodeKeys(fromHex(mainnetSystem), fromHex(IC_ROOT_KEY));
    expect(nodeKeys).toMatchInlineSnapshot(`
      Object {
        "nodeKeys": Array [
          "302a300506032b6570032100526742592f1e331aa13db7d1ebf224ff0b8231e0626eeefad0b629413a93e798",
          "302a300506032b657003210099c734e5f28c50741b04b63e87c77533d47dc2347524ed1ec8c266e429cef636",
          "302a300506032b657003210054432c37b495e9206b46b5ce85da87a7eb2d853cd3f02feec4acf39efe982850",
          "302a300506032b657003210059ef19e6aec7336d0912a80fe269ed4f0e8360cff9dc6fbe7a941643142bb4ff",
          "302a300506032b657003210076f7f52d74955cc045838a6ef71b882dd5339ba058bdcf1085f893b3545d44bf",
          "302a300506032b65700321000b4ca05b18b5dff4efc88badc802bccc4bae5ce2f16febe6a893904a240af360",
          "302a300506032b65700321003f29994149099aa1b1d2dcdaabe5eda73aea6866d067e2c45b97e216532bcd33",
          "302a300506032b65700321004323320684d4e1edb89bdcdee00844830a0f7de3e3cc7346e5a3868d1aef02b5",
          "302a300506032b6570032100a8fa77ad6c1da6d50d04fbc96bf33d0e30a67c1e8ba97fa3ce7c3d9c868a7b99",
          "302a300506032b65700321005e12ef0eae2809a5468471ee2d9745d23f20b1c0da7129fa447d96a67336be5b",
          "302a300506032b6570032100995e3dcf4b0fe927bee5172cef595b53bace86185890f052939a63d24eabf0da",
          "302a300506032b6570032100dc624cca12ec1daebedd007ec838e77990a6da3f8dff968ceebf3a0e8390562f",
          "302a300506032b6570032100d1955dd0b79c84d036422763c3a29154f31ab907ecdcfc9870db91db3e9dba7b",
          "302a300506032b6570032100767f31d2bb762bc9fa9b2cbe9f86504f16422f206fe4e61ec57b73a97fea2426",
          "302a300506032b65700321003dac46790dd80a38b0238ac3e1c1766fb3049a3b46d406c4ad85ccff42317a1e",
          "302a300506032b6570032100b80f4705b1420119acf881fb01e90f50044df72b1893cca44b4e81129e7a3e6e",
          "302a300506032b65700321008aa5bb79948b296c12c14131b35f9009ce331981b08c7ec57a595c6eda59d693",
          "302a300506032b6570032100031739d3139245f101349d4d2fb8cdc2e2707084d3fef1d033042d64ebd452bb",
          "302a300506032b6570032100cd59f18eea954c1fc8e315099657d929b6bfb7fefadb7bb214448809f4a9d19f",
          "302a300506032b657003210079d79503838b2b01791f66c18bc7614e19d3a6aba73bae00b92bb99edeea5287",
          "302a300506032b6570032100879ee566edf8a11717120cca3e4b1521f07a781c6d79ddda637b3a4c770f6fc6",
          "302a300506032b6570032100d8e091572c325ee4edf561c8f0c85f59203f4b79e955f2adcaf39dc9037b59cb",
          "302a300506032b6570032100bfa1b1575803d5fb21032a69ff50a04a3394dba63c509e9a1ae9edf781b3f174",
          "302a300506032b6570032100dc1a8cd77897793bb5b6bbbbbab2ac828f212c31ef7d8cd1a5e9da71d4368a1a",
          "302a300506032b6570032100b9f3c99d054c571483371cabababeba71a95af2f1db75a9eff5362a00168bab3",
          "302a300506032b6570032100cd8d2ec2ff21561e2772d9e68ea249dbe874c214899c33c5503444b34786be32",
          "302a300506032b6570032100013eb950162c07d85df53e01759052f239e953b592d13121ca5c038e28b6ea28",
          "302a300506032b65700321004558f956c1197f57de5eda61e88f6feb2bcd97cb69992edf3ed77326376447cc",
          "302a300506032b6570032100455044dd9eaf7a0dd463d8e194f4c10bd4943cfc9beaf0e7ae4074373d154893",
          "302a300506032b6570032100b1c163e31457e5af99033c20a313371c3a00237a3bedf2ce8cdfef475db5b875",
          "302a300506032b65700321000391e646f29f87929474489743d2958abd973ded1826d146b1d5cd67ae05b55d",
          "302a300506032b657003210004623b4767a979d854f118eaad12777b5ffa0ab0d9640708f68579cb4f670035",
          "302a300506032b657003210072de1b160077674e745a9d03e75a9432622aada8229d36d12b48ce567882e0d3",
          "302a300506032b6570032100c8cf4e899a7227b656028521ba6d7c305528e120498db2e145b5448b96f824cd",
          "302a300506032b65700321002f2e7160e775b899b3921b3a9676373a542c7ee4965d3b43952781820b880b93",
          "302a300506032b65700321003db88746a7def775447aebeab07f35a7ab325a1e156c1d076da2ef988cf4cf8d",
          "302a300506032b657003210088eccdb0ceab1a41a33496dbfc7abac145d1674363c527f36707b53b354f7d23",
          "302a300506032b65700321006fed5c19bfcdf67f1e8d9a866f826d89cb05bdcd40cb633a5d7645f82394665c",
          "302a300506032b657003210038e87a8fcc24cdaad8541ad88a0d1f521a8c9bbc29379382055602ca59d226ff",
          "302a300506032b65700321001909d5eefbb0075b3176069b7ac4a6e99934342a8fe5b3ec301d20b6cf453e53",
        ],
        "subnetId": "tdb26-jop6k-aogll-7ltgs-eruif-6kk7m-qpktf-gdiqx-mxtrf-vb5e6-eqe",
      }
    `);
  });

  it('should return the node keys from a local application subnet certificate', async () => {
    const { localApplication } = goldenCertificates;
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.parse('2023-09-27T20:14:59.406Z')));
    const cert = await Cert.Certificate.create({
      certificate: fromHex(localApplication),
      canisterId: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
      rootKey: fromHex(IC_ROOT_KEY),
    });

    const nodeKeys = fetchNodeKeys(fromHex(localApplication), fromHex(IC_ROOT_KEY));
    expect(nodeKeys).toMatchInlineSnapshot(`
      Object {
        "nodeKeys": Array [
          "302a300506032b6570032100526742592f1e331aa13db7d1ebf224ff0b8231e0626eeefad0b629413a93e798",
          "302a300506032b657003210099c734e5f28c50741b04b63e87c77533d47dc2347524ed1ec8c266e429cef636",
          "302a300506032b657003210054432c37b495e9206b46b5ce85da87a7eb2d853cd3f02feec4acf39efe982850",
          "302a300506032b657003210059ef19e6aec7336d0912a80fe269ed4f0e8360cff9dc6fbe7a941643142bb4ff",
          "302a300506032b657003210076f7f52d74955cc045838a6ef71b882dd5339ba058bdcf1085f893b3545d44bf",
          "302a300506032b65700321000b4ca05b18b5dff4efc88badc802bccc4bae5ce2f16febe6a893904a240af360",
          "302a300506032b65700321003f29994149099aa1b1d2dcdaabe5eda73aea6866d067e2c45b97e216532bcd33",
          "302a300506032b65700321004323320684d4e1edb89bdcdee00844830a0f7de3e3cc7346e5a3868d1aef02b5",
          "302a300506032b6570032100a8fa77ad6c1da6d50d04fbc96bf33d0e30a67c1e8ba97fa3ce7c3d9c868a7b99",
          "302a300506032b65700321005e12ef0eae2809a5468471ee2d9745d23f20b1c0da7129fa447d96a67336be5b",
          "302a300506032b6570032100995e3dcf4b0fe927bee5172cef595b53bace86185890f052939a63d24eabf0da",
          "302a300506032b6570032100dc624cca12ec1daebedd007ec838e77990a6da3f8dff968ceebf3a0e8390562f",
          "302a300506032b6570032100d1955dd0b79c84d036422763c3a29154f31ab907ecdcfc9870db91db3e9dba7b",
          "302a300506032b6570032100767f31d2bb762bc9fa9b2cbe9f86504f16422f206fe4e61ec57b73a97fea2426",
          "302a300506032b65700321003dac46790dd80a38b0238ac3e1c1766fb3049a3b46d406c4ad85ccff42317a1e",
          "302a300506032b6570032100b80f4705b1420119acf881fb01e90f50044df72b1893cca44b4e81129e7a3e6e",
          "302a300506032b65700321008aa5bb79948b296c12c14131b35f9009ce331981b08c7ec57a595c6eda59d693",
          "302a300506032b6570032100031739d3139245f101349d4d2fb8cdc2e2707084d3fef1d033042d64ebd452bb",
          "302a300506032b6570032100cd59f18eea954c1fc8e315099657d929b6bfb7fefadb7bb214448809f4a9d19f",
          "302a300506032b657003210079d79503838b2b01791f66c18bc7614e19d3a6aba73bae00b92bb99edeea5287",
          "302a300506032b6570032100879ee566edf8a11717120cca3e4b1521f07a781c6d79ddda637b3a4c770f6fc6",
          "302a300506032b6570032100d8e091572c325ee4edf561c8f0c85f59203f4b79e955f2adcaf39dc9037b59cb",
          "302a300506032b6570032100bfa1b1575803d5fb21032a69ff50a04a3394dba63c509e9a1ae9edf781b3f174",
          "302a300506032b6570032100dc1a8cd77897793bb5b6bbbbbab2ac828f212c31ef7d8cd1a5e9da71d4368a1a",
          "302a300506032b6570032100b9f3c99d054c571483371cabababeba71a95af2f1db75a9eff5362a00168bab3",
          "302a300506032b6570032100cd8d2ec2ff21561e2772d9e68ea249dbe874c214899c33c5503444b34786be32",
          "302a300506032b6570032100013eb950162c07d85df53e01759052f239e953b592d13121ca5c038e28b6ea28",
          "302a300506032b65700321004558f956c1197f57de5eda61e88f6feb2bcd97cb69992edf3ed77326376447cc",
          "302a300506032b6570032100455044dd9eaf7a0dd463d8e194f4c10bd4943cfc9beaf0e7ae4074373d154893",
          "302a300506032b6570032100b1c163e31457e5af99033c20a313371c3a00237a3bedf2ce8cdfef475db5b875",
          "302a300506032b65700321000391e646f29f87929474489743d2958abd973ded1826d146b1d5cd67ae05b55d",
          "302a300506032b657003210004623b4767a979d854f118eaad12777b5ffa0ab0d9640708f68579cb4f670035",
          "302a300506032b657003210072de1b160077674e745a9d03e75a9432622aada8229d36d12b48ce567882e0d3",
          "302a300506032b6570032100c8cf4e899a7227b656028521ba6d7c305528e120498db2e145b5448b96f824cd",
          "302a300506032b65700321002f2e7160e775b899b3921b3a9676373a542c7ee4965d3b43952781820b880b93",
          "302a300506032b65700321003db88746a7def775447aebeab07f35a7ab325a1e156c1d076da2ef988cf4cf8d",
          "302a300506032b657003210088eccdb0ceab1a41a33496dbfc7abac145d1674363c527f36707b53b354f7d23",
          "302a300506032b65700321006fed5c19bfcdf67f1e8d9a866f826d89cb05bdcd40cb633a5d7645f82394665c",
          "302a300506032b657003210038e87a8fcc24cdaad8541ad88a0d1f521a8c9bbc29379382055602ca59d226ff",
          "302a300506032b65700321001909d5eefbb0075b3176069b7ac4a6e99934342a8fe5b3ec301d20b6cf453e53",
        ],
        "subnetId": "tdb26-jop6k-aogll-7ltgs-eruif-6kk7m-qpktf-gdiqx-mxtrf-vb5e6-eqe",
      }
    `);
  });

  it('should return the node keys from a local system subnet certificate', async () => {
    const { localSystem } = goldenCertificates;
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.parse('2023-09-27T20:15:03.406Z')));
    const cert = await Cert.Certificate.create({
      certificate: fromHex(localSystem),
      canisterId: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
      rootKey: fromHex(IC_ROOT_KEY),
    });

    const nodeKeys = fetchNodeKeys(fromHex(localSystem), fromHex(IC_ROOT_KEY));
    expect(nodeKeys).toMatchInlineSnapshot(`
      Object {
        "nodeKeys": Array [
          "302a300506032b6570032100526742592f1e331aa13db7d1ebf224ff0b8231e0626eeefad0b629413a93e798",
          "302a300506032b657003210099c734e5f28c50741b04b63e87c77533d47dc2347524ed1ec8c266e429cef636",
          "302a300506032b657003210054432c37b495e9206b46b5ce85da87a7eb2d853cd3f02feec4acf39efe982850",
          "302a300506032b657003210059ef19e6aec7336d0912a80fe269ed4f0e8360cff9dc6fbe7a941643142bb4ff",
          "302a300506032b657003210076f7f52d74955cc045838a6ef71b882dd5339ba058bdcf1085f893b3545d44bf",
          "302a300506032b65700321000b4ca05b18b5dff4efc88badc802bccc4bae5ce2f16febe6a893904a240af360",
          "302a300506032b65700321003f29994149099aa1b1d2dcdaabe5eda73aea6866d067e2c45b97e216532bcd33",
          "302a300506032b65700321004323320684d4e1edb89bdcdee00844830a0f7de3e3cc7346e5a3868d1aef02b5",
          "302a300506032b6570032100a8fa77ad6c1da6d50d04fbc96bf33d0e30a67c1e8ba97fa3ce7c3d9c868a7b99",
          "302a300506032b65700321005e12ef0eae2809a5468471ee2d9745d23f20b1c0da7129fa447d96a67336be5b",
          "302a300506032b6570032100995e3dcf4b0fe927bee5172cef595b53bace86185890f052939a63d24eabf0da",
          "302a300506032b6570032100dc624cca12ec1daebedd007ec838e77990a6da3f8dff968ceebf3a0e8390562f",
          "302a300506032b6570032100d1955dd0b79c84d036422763c3a29154f31ab907ecdcfc9870db91db3e9dba7b",
          "302a300506032b6570032100767f31d2bb762bc9fa9b2cbe9f86504f16422f206fe4e61ec57b73a97fea2426",
          "302a300506032b65700321003dac46790dd80a38b0238ac3e1c1766fb3049a3b46d406c4ad85ccff42317a1e",
          "302a300506032b6570032100b80f4705b1420119acf881fb01e90f50044df72b1893cca44b4e81129e7a3e6e",
          "302a300506032b65700321008aa5bb79948b296c12c14131b35f9009ce331981b08c7ec57a595c6eda59d693",
          "302a300506032b6570032100031739d3139245f101349d4d2fb8cdc2e2707084d3fef1d033042d64ebd452bb",
          "302a300506032b6570032100cd59f18eea954c1fc8e315099657d929b6bfb7fefadb7bb214448809f4a9d19f",
          "302a300506032b657003210079d79503838b2b01791f66c18bc7614e19d3a6aba73bae00b92bb99edeea5287",
          "302a300506032b6570032100879ee566edf8a11717120cca3e4b1521f07a781c6d79ddda637b3a4c770f6fc6",
          "302a300506032b6570032100d8e091572c325ee4edf561c8f0c85f59203f4b79e955f2adcaf39dc9037b59cb",
          "302a300506032b6570032100bfa1b1575803d5fb21032a69ff50a04a3394dba63c509e9a1ae9edf781b3f174",
          "302a300506032b6570032100dc1a8cd77897793bb5b6bbbbbab2ac828f212c31ef7d8cd1a5e9da71d4368a1a",
          "302a300506032b6570032100b9f3c99d054c571483371cabababeba71a95af2f1db75a9eff5362a00168bab3",
          "302a300506032b6570032100cd8d2ec2ff21561e2772d9e68ea249dbe874c214899c33c5503444b34786be32",
          "302a300506032b6570032100013eb950162c07d85df53e01759052f239e953b592d13121ca5c038e28b6ea28",
          "302a300506032b65700321004558f956c1197f57de5eda61e88f6feb2bcd97cb69992edf3ed77326376447cc",
          "302a300506032b6570032100455044dd9eaf7a0dd463d8e194f4c10bd4943cfc9beaf0e7ae4074373d154893",
          "302a300506032b6570032100b1c163e31457e5af99033c20a313371c3a00237a3bedf2ce8cdfef475db5b875",
          "302a300506032b65700321000391e646f29f87929474489743d2958abd973ded1826d146b1d5cd67ae05b55d",
          "302a300506032b657003210004623b4767a979d854f118eaad12777b5ffa0ab0d9640708f68579cb4f670035",
          "302a300506032b657003210072de1b160077674e745a9d03e75a9432622aada8229d36d12b48ce567882e0d3",
          "302a300506032b6570032100c8cf4e899a7227b656028521ba6d7c305528e120498db2e145b5448b96f824cd",
          "302a300506032b65700321002f2e7160e775b899b3921b3a9676373a542c7ee4965d3b43952781820b880b93",
          "302a300506032b65700321003db88746a7def775447aebeab07f35a7ab325a1e156c1d076da2ef988cf4cf8d",
          "302a300506032b657003210088eccdb0ceab1a41a33496dbfc7abac145d1674363c527f36707b53b354f7d23",
          "302a300506032b65700321006fed5c19bfcdf67f1e8d9a866f826d89cb05bdcd40cb633a5d7645f82394665c",
          "302a300506032b657003210038e87a8fcc24cdaad8541ad88a0d1f521a8c9bbc29379382055602ca59d226ff",
          "302a300506032b65700321001909d5eefbb0075b3176069b7ac4a6e99934342a8fe5b3ec301d20b6cf453e53",
        ],
        "subnetId": "tdb26-jop6k-aogll-7ltgs-eruif-6kk7m-qpktf-gdiqx-mxtrf-vb5e6-eqe",
      }
    `);
  });
});
