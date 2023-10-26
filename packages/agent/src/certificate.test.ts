/**
 * Need this to setup the proper ArrayBuffer type (otherwise in jest ArrayBuffer isn't
 * an instance of ArrayBuffer).
 * @jest-environment node
 */
import * as cbor from './cbor';
import * as Cert from './certificate';
import { fromHex, toHex } from './utils/buffer';
import { Principal } from '@dfinity/principal';
import { decodeTime } from './utils/leb';
import { lookupResultToBuffer, lookup_path } from './certificate';
import { goldenCertificates } from './agent/http/__certificates__/goldenCertificates.test';

function label(str: string): ArrayBuffer {
  return new TextEncoder().encode(str);
}

function pruned(str: string): ArrayBuffer {
  return fromHex(str);
}

// Root public key for the IC main net, encoded as hex
const IC_ROOT_KEY =
  '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100814' +
  'c0e6ec71fab583b08bd81373c255c3c371b2e84863c98a4f1e08b74235d14fb5d9c0cd546d968' +
  '5f913a0c0b2cc5341583bf4b4392e467db96d65b9bb4cb717112f8472e0d5a4d14505ffd7484' +
  'b01291091c5f87b98883463f98091a0baaae';

test('hash tree', async () => {
  const cborEncode = fromHex(
    '8301830183024161830183018302417882034568656c6c6f810083024179820345776f726c64' +
      '83024162820344676f6f648301830241638100830241648203476d6f726e696e67',
  );
  const expected: Cert.HashTree = [
    1,
    [
      1,
      [
        2,
        label('a'),
        [1, [1, [2, label('x'), [3, label('hello')]], [0]], [2, label('y'), [3, label('world')]]],
      ],
      [2, label('b'), [3, label('good')]],
    ],
    [1, [2, label('c'), [0]], [2, label('d'), [3, label('morning')]]],
  ];
  const tree: Cert.HashTree = cbor.decode(new Uint8Array(cborEncode));
  expect(tree).toMatchObject(expected);

  expect(toHex(await Cert.reconstruct(tree))).toEqual(
    'eb5c5b2195e62d996b84c9bcc8259d19a83786a2f59e0878cec84c811f669aa0',
  );
});

test('pruned hash tree', async () => {
  const cborEncode = fromHex(
    '83018301830241618301820458201b4feff9bef8131788b0c9dc6dbad6e81e524249c879e9f1' +
      '0f71ce3749f5a63883024179820345776f726c6483024162820458207b32ac0c6ba8ce35ac' +
      '82c255fc7906f7fc130dab2a090f80fe12f9c2cae83ba6830182045820ec8324b8a1f1ac16' +
      'bd2e806edba78006479c9877fed4eb464a25485465af601d830241648203476d6f726e696e67',
  );
  const expected: Cert.HashTree = [
    1,
    [
      1,
      [
        2,
        label('a'),
        [
          1,
          [4, pruned('1b4feff9bef8131788b0c9dc6dbad6e81e524249c879e9f10f71ce3749f5a638')],
          [2, label('y'), [3, label('world')]],
        ],
      ],
      [
        2,
        label('b'),
        [4, pruned('7b32ac0c6ba8ce35ac82c255fc7906f7fc130dab2a090f80fe12f9c2cae83ba6')],
      ],
    ],
    [
      1,
      [4, pruned('ec8324b8a1f1ac16bd2e806edba78006479c9877fed4eb464a25485465af601d')],
      [2, label('d'), [3, label('morning')]],
    ],
  ];
  const tree: Cert.HashTree = cbor.decode(new Uint8Array(cborEncode));
  expect(tree).toMatchObject(expected);
  expect(toHex(await Cert.reconstruct(tree))).toEqual(
    'eb5c5b2195e62d996b84c9bcc8259d19a83786a2f59e0878cec84c811f669aa0',
  );
});

test('lookup', () => {
  const tree: Cert.HashTree = [
    1,
    [
      1,
      [
        2,
        label('a'),
        [
          1,
          [4, pruned('1b4feff9bef8131788b0c9dc6dbad6e81e524249c879e9f10f71ce3749f5a638')],
          [2, label('y'), [3, label('world')]],
        ],
      ],
      [
        2,
        label('b'),
        [4, pruned('7b32ac0c6ba8ce35ac82c255fc7906f7fc130dab2a090f80fe12f9c2cae83ba6')],
      ],
    ],
    [
      1,
      [4, pruned('ec8324b8a1f1ac16bd2e806edba78006479c9877fed4eb464a25485465af601d')],
      [2, label('d'), [3, label('morning')]],
    ],
  ];

  function toText(buff: ArrayBuffer): string {
    const decoder = new TextDecoder();
    let t = decoder.decode(buff);
    return t;
  }
  function fromText(str: string): ArrayBuffer {
    return new TextEncoder().encode(str);
  }
  expect(Cert.lookup_path([fromText('a'), fromText('a')], tree)).toEqual(undefined);
  expect(
    toText(lookupResultToBuffer(Cert.lookup_path([fromText('a'), fromText('y')], tree))!),
  ).toEqual('world');
  expect(Cert.lookup_path([fromText('aa')], tree)).toEqual(undefined);
  expect(Cert.lookup_path([fromText('ax')], tree)).toEqual(undefined);
  expect(Cert.lookup_path([fromText('b')], tree)).toEqual(undefined);
  expect(Cert.lookup_path([fromText('bb')], tree)).toEqual(undefined);
  expect(toText(lookupResultToBuffer(Cert.lookup_path([fromText('d')], tree))!)).toEqual('morning');
  expect(Cert.lookup_path([fromText('e')], tree)).toEqual(undefined);
});

// The sample certificate for testing delegation is extracted from the response used in agent-rs tests, where they were taken
// from an interaction with the IC mainnet.
const SAMPLE_CERT: string =
  'd9d9f7a364747265658301830182045820250f5e26868d9c1ea7ab29cbe9c15bf1c47c0d7605e803e39e375a7fe09c6ebb830183024e726571756573745f7374617475738301820458204b268227774ec77ff2b37ecb12157329d54cf376694bdd59ded7803efd82386f83025820edad510eaaa08ed2acd4781324e6446269da6753ec17760f206bbe81c465ff528301830183024b72656a6563745f636f64658203410383024e72656a6563745f6d6573736167658203584443616e69737465722069766733372d71696161612d61616161622d61616167612d63616920686173206e6f20757064617465206d6574686f64202772656769737465722783024673746174757382034872656a65637465648204582097232f31f6ab7ca4fe53eb6568fc3e02bc22fe94ab31d010e5fb3c642301f1608301820458203a48d1fc213d49307103104f7d72c2b5930edba8787b90631f343b3aa68a5f0a83024474696d65820349e2dc939091c696eb16697369676e6174757265583089a2be21b5fa8ac9fab1527e041327ce899d7da971436a1f2165393947b4d942365bfe5488710e61a619ba48388a21b16a64656c65676174696f6ea2697375626e65745f6964581dd77b2a2f7199b9a8aec93fe6fb588661358cf12223e9a3af7b4ebac4026b6365727469666963617465590231d9d9f7a26474726565830182045820ae023f28c3b9d966c8fb09f9ed755c828aadb5152e00aaf700b18c9c067294b483018302467375626e6574830182045820e83bb025f6574c8f31233dc0fe289ff546dfa1e49bd6116dd6e8896d90a4946e830182045820e782619092d69d5bebf0924138bd4116b0156b5a95e25c358ea8cf7e7161a661830183018204582062513fa926c9a9ef803ac284d620f303189588e1d3904349ab63b6470856fc4883018204582060e9a344ced2c9c4a96a0197fd585f2d259dbd193e4eada56239cac26087f9c58302581dd77b2a2f7199b9a8aec93fe6fb588661358cf12223e9a3af7b4ebac402830183024f63616e69737465725f72616e6765738203581bd9d9f781824a000000000020000001014a00000000002fffff010183024a7075626c69635f6b657982035885308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c050302010361009933e1f89e8a3c4d7fdcccdbd518089e2bd4d8180a261f18d9c247a52768ebce98dc7328a39814a8f911086a1dd50cbe015e2a53b7bf78b55288893daa15c346640e8831d72a12bdedd979d28470c34823b8d1c3f4795d9c3984a247132e94fe82045820996f17bb926be3315745dea7282005a793b58e76afeb5d43d1a28ce29d2d158583024474696d6582034995b8aac0e4eda2ea16697369676e61747572655830ace9fcdd9bc977e05d6328f889dc4e7c99114c737a494653cb27a1f55c06f4555e0f160980af5ead098acc195010b2f7';

const parseTimeFromCert = (cert: ArrayBuffer): Date => {
  const certObj = cbor.decode(new Uint8Array(cert)) as any;
  if (!certObj.tree) throw new Error('Invalid certificate');
  const lookup = lookupResultToBuffer(lookup_path(['time'], certObj.tree));
  if (!lookup) throw new Error('Invalid certificate');

  return decodeTime(lookup);
};

test('date lookup is consistent', async () => {
  const dateSet = new Set<string>();
  const nowSet = new Set<string>();
  for (let i = 0; i < 100; i++) {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.parse('2022-02-17T10:17:49.668Z')));

    const time = parseTimeFromCert(fromHex(SAMPLE_CERT));
    dateSet.add(time.toISOString());
    nowSet.add(new Date().toISOString());
  }
  expect(dateSet.size).toEqual(1);
  expect(nowSet.size).toEqual(1);
});

test('delegation works for canisters within the subnet range', async () => {
  // The certificate specifies the range from
  // 0x00000000002000000101
  // to
  // 0x00000000002FFFFF0101
  const rangeStart = Principal.fromHex('00000000002000000101');
  const rangeInterior = Principal.fromHex('000000000020000C0101');
  const rangeEnd = Principal.fromHex('00000000002FFFFF0101');
  async function verifies(canisterId) {
    jest.setSystemTime(new Date(Date.parse('2022-02-23T07:38:00.652Z')));
    await expect(
      Cert.Certificate.create({
        certificate: fromHex(SAMPLE_CERT),
        rootKey: fromHex(IC_ROOT_KEY),
        canisterId: canisterId,
      }),
    ).resolves.not.toThrow();
  }
  await verifies(rangeStart);
  await verifies(rangeInterior);
  await verifies(rangeEnd);
});

test('delegation check fails for canisters outside of the subnet range', async () => {
  // Use a different principal than the happy path, which isn't in the delegation ranges.
  // The certificate specifies the range from
  // 0x00000000002000000101
  // to
  // 0x00000000002FFFFF0101
  const beforeRange = Principal.fromHex('00000000000000020101');
  const afterRange = Principal.fromHex('00000000003000020101');
  async function certificateFails(canisterId) {
    await expect(
      Cert.Certificate.create({
        certificate: fromHex(SAMPLE_CERT),
        rootKey: fromHex(IC_ROOT_KEY),
        canisterId: canisterId,
      }),
    ).rejects.toThrow(/Invalid certificate/);
  }
  await certificateFails(beforeRange);
  await certificateFails(afterRange);
});

type FakeCert = {
  tree: Cert.HashTree;
  signature: ArrayBuffer;
  delegation?: { subnet_id: ArrayBuffer; certificate: ArrayBuffer };
};

test('certificate verification fails for an invalid signature', async () => {
  const badCert: FakeCert = cbor.decode(fromHex(SAMPLE_CERT));
  badCert.signature = new ArrayBuffer(badCert.signature.byteLength);
  const badCertEncoded = cbor.encode(badCert);
  await expect(
    Cert.Certificate.create({
      certificate: badCertEncoded,
      rootKey: fromHex(IC_ROOT_KEY),
      canisterId: Principal.fromText('ivg37-qiaaa-aaaab-aaaga-cai'),
    }),
  ).rejects.toThrow('Invalid certificate');
});

test('certificate verification fails if the time of the certificate is > 5 minutes in the past', async () => {
  const badCert: FakeCert = cbor.decode(fromHex(SAMPLE_CERT));
  const badCertEncoded = cbor.encode(badCert);

  const tenMinutesFuture = Date.parse('2022-02-23T07:48:00.652Z');
  jest.setSystemTime(tenMinutesFuture);
  await expect(
    Cert.Certificate.create({
      certificate: badCertEncoded,
      rootKey: fromHex(IC_ROOT_KEY),
      canisterId: Principal.fromText('ivg37-qiaaa-aaaab-aaaga-cai'),
    }),
  ).rejects.toThrow('Invalid certificate: Certificate is signed more than 5 minutes in the past');
});

test('certificate verification fails if the time of the certificate is > 5 minutes in the future', async () => {
  const badCert: FakeCert = cbor.decode(fromHex(SAMPLE_CERT));
  const badCertEncoded = cbor.encode(badCert);
  const tenMinutesPast = Date.parse('2022-02-23T07:28:00.652Z');
  jest.setSystemTime(tenMinutesPast);

  await expect(
    Cert.Certificate.create({
      certificate: badCertEncoded,
      rootKey: fromHex(IC_ROOT_KEY),
      canisterId: Principal.fromText('ivg37-qiaaa-aaaab-aaaga-cai'),
    }),
  ).rejects.toThrow('Invalid certificate: Certificate is signed more than 5 minutes in the future');
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

    const nodeKeys = cert.cache_node_keys();
    expect(nodeKeys).toMatchInlineSnapshot(`
      Object {
        "metrics": Object {
          "canister_state_bytes": 10007399447n,
          "consumed_cycles_total": Object {
            "current": 15136490391288n,
            "deleted": 0n,
          },
          "num_canisters": 451n,
          "update_transactions_total": 222360n,
        },
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

    const nodeKeys = cert.cache_node_keys();
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

    const nodeKeys = cert.cache_node_keys();
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

    const nodeKeys = cert.cache_node_keys();
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
