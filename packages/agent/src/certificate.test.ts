/**
 * Need this to setup the proper ArrayBuffer type (otherwise in jest ArrayBuffer isn't
 * an instance of ArrayBuffer).
 * @jest-environment node
 */
import * as cbor from './cbor';
import * as Cert from './certificate';
import { bufEquals, fromHex, toHex } from './utils/buffer';
import { Principal } from '@dfinity/principal';
import { decodeTime } from './utils/leb';
import { readFileSync } from 'fs';
import path from 'path';

function label(str: string): ArrayBuffer {
  return new TextEncoder().encode(str);
}

function pruned(str: string): ArrayBuffer {
  return fromHex(str);
}

(expect as any).addEqualityTesters([bufEquals]);

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
    Cert.NodeType.Fork,
    [
      Cert.NodeType.Fork,
      [
        Cert.NodeType.Labeled,
        label('a'),
        [
          Cert.NodeType.Fork,
          [
            Cert.NodeType.Fork,
            [Cert.NodeType.Labeled, label('x'), [3, label('hello')]],
            [Cert.NodeType.Empty],
          ],
          [Cert.NodeType.Labeled, label('y'), [Cert.NodeType.Leaf, label('world')]],
        ],
      ],
      [Cert.NodeType.Labeled, label('b'), [Cert.NodeType.Leaf, label('good')]],
    ],
    [
      Cert.NodeType.Fork,
      [Cert.NodeType.Labeled, label('c'), [Cert.NodeType.Empty]],
      [Cert.NodeType.Labeled, label('d'), [Cert.NodeType.Leaf, label('morning')]],
    ],
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
    Cert.NodeType.Fork,
    [
      Cert.NodeType.Fork,
      [
        Cert.NodeType.Labeled,
        label('a'),
        [
          Cert.NodeType.Fork,
          [4, pruned('1b4feff9bef8131788b0c9dc6dbad6e81e524249c879e9f10f71ce3749f5a638')],
          [Cert.NodeType.Labeled, label('y'), [Cert.NodeType.Leaf, label('world')]],
        ],
      ],
      [
        Cert.NodeType.Labeled,
        label('b'),
        [
          Cert.NodeType.Pruned,
          pruned('7b32ac0c6ba8ce35ac82c255fc7906f7fc130dab2a090f80fe12f9c2cae83ba6'),
        ],
      ],
    ],
    [
      Cert.NodeType.Fork,
      [
        Cert.NodeType.Pruned,
        pruned('ec8324b8a1f1ac16bd2e806edba78006479c9877fed4eb464a25485465af601d'),
      ],
      [Cert.NodeType.Labeled, label('d'), [Cert.NodeType.Leaf, label('morning')]],
    ],
  ];
  const tree: Cert.HashTree = cbor.decode(new Uint8Array(cborEncode));
  expect(tree).toMatchObject(expected);
  expect(toHex(await Cert.reconstruct(tree))).toEqual(
    'eb5c5b2195e62d996b84c9bcc8259d19a83786a2f59e0878cec84c811f669aa0',
  );
});

describe('lookup', () => {
  const tree: Cert.HashTree = [
    Cert.NodeType.Fork,
    [
      Cert.NodeType.Fork,
      [
        Cert.NodeType.Fork,
        [
          Cert.NodeType.Labeled,
          label('a'),
          [
            Cert.NodeType.Pruned,
            pruned('1b842dfc254abb83e61bcdd7b7c24492322a2e1b006e6d20b88bedd147c248fc'),
          ],
        ],
        [Cert.NodeType.Labeled, label('c'), [Cert.NodeType.Leaf, label('hello')]],
      ],
      [
        Cert.NodeType.Labeled,
        label('d'),
        [
          Cert.NodeType.Fork,
          [Cert.NodeType.Labeled, label('1'), [Cert.NodeType.Leaf, label('42')]],
          [
            Cert.NodeType.Pruned,
            pruned('5ec92bd71f697eee773919200a9718c4719495a4c6bba52acc408bd79b4bf57f'),
          ],
        ],
      ],
    ],
    [
      Cert.NodeType.Fork,
      [Cert.NodeType.Labeled, label('e'), [Cert.NodeType.Leaf, label('world')]],
      [Cert.NodeType.Labeled, label('g'), [Cert.NodeType.Empty]],
    ],
  ];

  test('subtree_a', () => {
    // a subtree at label `a` exists
    const lookup_a = Cert.find_label(label('a'), tree);
    expect(lookup_a).toEqual({
      status: Cert.LookupStatus.Found,
      value: [
        Cert.NodeType.Pruned,
        pruned('1b842dfc254abb83e61bcdd7b7c24492322a2e1b006e6d20b88bedd147c248fc'),
      ],
    });
    expect(Cert.lookup_path([label('a')], tree)).toEqual({
      status: Cert.LookupStatus.Found,
      value: [
        Cert.NodeType.Pruned,
        pruned('1b842dfc254abb83e61bcdd7b7c24492322a2e1b006e6d20b88bedd147c248fc'),
      ],
    });

    // the subtree at label `a` is pruned,
    // so any nested lookups should return Unknown
    const tree_a = (lookup_a as Cert.LookupResultFound).value as Cert.HashTree;

    expect(Cert.find_label(label('1'), tree_a)).toEqual({
      status: Cert.LookupStatus.Unknown,
    });
    expect(Cert.lookup_path([label('1')], tree_a)).toEqual({
      status: Cert.LookupStatus.Unknown,
    });
    expect(Cert.lookup_path([label('a'), label('1')], tree)).toEqual({
      status: Cert.LookupStatus.Unknown,
    });

    expect(Cert.find_label(label('2'), tree_a)).toEqual({
      status: Cert.LookupStatus.Unknown,
    });
    expect(Cert.lookup_path([label('2')], tree_a)).toEqual({
      status: Cert.LookupStatus.Unknown,
    });
    expect(Cert.lookup_path([label('a'), label('2')], tree)).toEqual({
      status: Cert.LookupStatus.Unknown,
    });
  });

  test('subtree_b', () => {
    // there are no nodes between labels `a` and `c`,
    // so the subtree at label `b` is provably Absent
    expect(Cert.find_label(label('b'), tree)).toEqual({
      status: Cert.LookupStatus.Absent,
    });
    expect(Cert.lookup_path([label('b')], tree)).toEqual({
      status: Cert.LookupStatus.Absent,
    });
  });

  test('subtree_c', () => {
    // a subtree at label `c` exists
    expect(Cert.find_label(label('c'), tree)).toEqual({
      status: Cert.LookupStatus.Found,
      value: [Cert.NodeType.Leaf, label('hello')],
    });
    expect(Cert.lookup_path([label('c')], tree)).toEqual({
      status: Cert.LookupStatus.Found,
      value: label('hello'),
    });
  });

  test('subtree_d', () => {
    // a subtree at label `d` exists
    const lookup_d = Cert.find_label(label('d'), tree);
    expect(lookup_d).toEqual({
      status: Cert.LookupStatus.Found,
      value: [
        Cert.NodeType.Fork,
        [Cert.NodeType.Labeled, label('1'), [Cert.NodeType.Leaf, label('42')]],
        [
          Cert.NodeType.Pruned,
          pruned('5ec92bd71f697eee773919200a9718c4719495a4c6bba52acc408bd79b4bf57f'),
        ],
      ],
    });
    expect(Cert.lookup_path([label('d')], tree)).toEqual({
      status: Cert.LookupStatus.Found,
      value: [
        Cert.NodeType.Fork,
        [Cert.NodeType.Labeled, label('1'), [Cert.NodeType.Leaf, label('42')]],
        [
          Cert.NodeType.Pruned,
          pruned('5ec92bd71f697eee773919200a9718c4719495a4c6bba52acc408bd79b4bf57f'),
        ],
      ],
    });

    const tree_d = (lookup_d as Cert.LookupResultFound).value as Cert.HashTree;
    // a subtree at label `1` exists in the subtree at label `d`
    expect(Cert.find_label(label('1'), tree_d)).toEqual({
      status: Cert.LookupStatus.Found,
      value: [Cert.NodeType.Leaf, label('42')],
    });
    expect(Cert.lookup_path([label('1')], tree_d)).toEqual({
      status: Cert.LookupStatus.Found,
      value: label('42'),
    });
    expect(Cert.lookup_path([label('d'), label('1')], tree)).toEqual({
      status: Cert.LookupStatus.Found,
      value: label('42'),
    });

    // the rest of the subtree at label `d` is pruned,
    // so any more lookups return Unknown
    expect(Cert.find_label(label('2'), tree_d)).toEqual({
      status: Cert.LookupStatus.Unknown,
    });
    expect(Cert.lookup_path([label('2')], tree_d)).toEqual({
      status: Cert.LookupStatus.Unknown,
    });
    expect(Cert.lookup_path([label('d'), label('2')], tree)).toEqual({
      status: Cert.LookupStatus.Unknown,
    });
  });

  test('subtree_e', () => {
    // a subtree at label `e` exists
    expect(Cert.find_label(label('e'), tree)).toEqual({
      status: Cert.LookupStatus.Found,
      value: [Cert.NodeType.Leaf, label('world')],
    });
    expect(Cert.lookup_path([label('e')], tree)).toEqual({
      status: Cert.LookupStatus.Found,
      value: label('world'),
    });
  });

  test('subtree_f', () => {
    // there are no nodes between labels `e` and `g`,
    // so the subtree at `f` is provably Absent
    expect(Cert.find_label(label('f'), tree)).toEqual({
      status: Cert.LookupStatus.Absent,
    });
    expect(Cert.lookup_path([label('f')], tree)).toEqual({
      status: Cert.LookupStatus.Absent,
    });
  });

  test('subtree_g', () => {
    // a subtree at label `g` exists
    const lookup_g = Cert.find_label(label('g'), tree);
    expect(lookup_g).toEqual({
      status: Cert.LookupStatus.Found,
      value: [Cert.NodeType.Empty],
    });
    expect(Cert.lookup_path([label('g')], tree)).toEqual({
      status: Cert.LookupStatus.Found,
      value: [Cert.NodeType.Empty],
    });

    // the subtree at label `g` is empty so any nested lookup are provably Absent
    const tree_g = (lookup_g as Cert.LookupResultFound).value as Cert.HashTree;
    expect(Cert.find_label(label('1'), tree_g)).toEqual({
      status: Cert.LookupStatus.Absent,
    });
    expect(Cert.lookup_path([label('1')], tree_g)).toEqual({
      status: Cert.LookupStatus.Absent,
    });
    expect(Cert.lookup_path([label('g'), label('1')], tree)).toEqual({
      status: Cert.LookupStatus.Absent,
    });

    expect(Cert.find_label(label('2'), tree_g)).toEqual({
      status: Cert.LookupStatus.Absent,
    });
    expect(Cert.lookup_path([label('2')], tree_g)).toEqual({
      status: Cert.LookupStatus.Absent,
    });
    expect(Cert.lookup_path([label('g'), label('2')], tree)).toEqual({
      status: Cert.LookupStatus.Absent,
    });
  });
});

// The sample certificate for testing delegation is extracted from the response used in agent-rs tests, where they were taken
// from an interaction with the IC mainnet.
const SAMPLE_CERT: string =
  'd9d9f7a364747265658301830182045820250f5e26868d9c1ea7ab29cbe9c15bf1c47c0d7605e803e39e375a7fe09c6ebb830183024e726571756573745f7374617475738301820458204b268227774ec77ff2b37ecb12157329d54cf376694bdd59ded7803efd82386f83025820edad510eaaa08ed2acd4781324e6446269da6753ec17760f206bbe81c465ff528301830183024b72656a6563745f636f64658203410383024e72656a6563745f6d6573736167658203584443616e69737465722069766733372d71696161612d61616161622d61616167612d63616920686173206e6f20757064617465206d6574686f64202772656769737465722783024673746174757382034872656a65637465648204582097232f31f6ab7ca4fe53eb6568fc3e02bc22fe94ab31d010e5fb3c642301f1608301820458203a48d1fc213d49307103104f7d72c2b5930edba8787b90631f343b3aa68a5f0a83024474696d65820349e2dc939091c696eb16697369676e6174757265583089a2be21b5fa8ac9fab1527e041327ce899d7da971436a1f2165393947b4d942365bfe5488710e61a619ba48388a21b16a64656c65676174696f6ea2697375626e65745f6964581dd77b2a2f7199b9a8aec93fe6fb588661358cf12223e9a3af7b4ebac4026b6365727469666963617465590231d9d9f7a26474726565830182045820ae023f28c3b9d966c8fb09f9ed755c828aadb5152e00aaf700b18c9c067294b483018302467375626e6574830182045820e83bb025f6574c8f31233dc0fe289ff546dfa1e49bd6116dd6e8896d90a4946e830182045820e782619092d69d5bebf0924138bd4116b0156b5a95e25c358ea8cf7e7161a661830183018204582062513fa926c9a9ef803ac284d620f303189588e1d3904349ab63b6470856fc4883018204582060e9a344ced2c9c4a96a0197fd585f2d259dbd193e4eada56239cac26087f9c58302581dd77b2a2f7199b9a8aec93fe6fb588661358cf12223e9a3af7b4ebac402830183024f63616e69737465725f72616e6765738203581bd9d9f781824a000000000020000001014a00000000002fffff010183024a7075626c69635f6b657982035885308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c050302010361009933e1f89e8a3c4d7fdcccdbd518089e2bd4d8180a261f18d9c247a52768ebce98dc7328a39814a8f911086a1dd50cbe015e2a53b7bf78b55288893daa15c346640e8831d72a12bdedd979d28470c34823b8d1c3f4795d9c3984a247132e94fe82045820996f17bb926be3315745dea7282005a793b58e76afeb5d43d1a28ce29d2d158583024474696d6582034995b8aac0e4eda2ea16697369676e61747572655830ace9fcdd9bc977e05d6328f889dc4e7c99114c737a494653cb27a1f55c06f4555e0f160980af5ead098acc195010b2f7';

const parseTimeFromCert = (cert: ArrayBuffer): Date => {
  const certObj = cbor.decode(new Uint8Array(cert)) as { tree: Cert.HashTree };
  if (!certObj.tree) throw new Error('Invalid certificate');
  const lookup = Cert.lookupResultToBuffer(Cert.lookup_path(['time'], certObj.tree));
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
  async function verifies(canisterId: Principal) {
    jest.setSystemTime(new Date(Date.parse('2022-02-23T07:38:00.652Z')));
    await expect(
      Cert.Certificate.create({
        certificate: fromHex(SAMPLE_CERT),
        rootKey: fromHex(IC_ROOT_KEY),
        canisterId: canisterId,
        blsVerify: async () => true,
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
  async function certificateFails(canisterId: Principal) {
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
      blsVerify: async () => true,
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
      blsVerify: async () => true,
    }),
  ).rejects.toThrow('Invalid certificate: Certificate is signed more than 5 minutes in the future');
});

test('certificate verification fails on nested delegations', async () => {
  // This is a recorded certificate from a read_state request to the II
  // subnet, with the /subnet tree included. Thus, it could be used as its
  // own delegation, according to the old interface spec definition.
  const withSubnetSubtree = readFileSync(path.join(__dirname, 'bin/with_subnet_key.bin'));
  const canisterId = Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai');
  const subnetId = Principal.fromText(
    'uzr34-akd3s-xrdag-3ql62-ocgoh-ld2ao-tamcv-54e7j-krwgb-2gm4z-oqe',
  );
  jest.setSystemTime(new Date(Date.parse('2023-12-12T10:40:00.652Z')));
  const cert: Cert.Cert = cbor.decode(withSubnetSubtree);
  const overlyNested = cbor.encode({
    tree: cert.tree,
    signature: cert.signature,
    delegation: {
      subnet_id: subnetId.toUint8Array(),
      certificate: withSubnetSubtree,
    },
  });
  await expect(
    Cert.Certificate.create({
      certificate: overlyNested,
      rootKey: fromHex(IC_ROOT_KEY),
      canisterId: canisterId,
    }),
  ).rejects.toThrow('Invalid certificate: Delegation certificates cannot be nested');
});
