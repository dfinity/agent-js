import { Buffer } from 'buffer/';
import * as cbor from './cbor';
import * as Cert from './certificate';

function label(str: string): ArrayBuffer {
  return Buffer.from(str).buffer;
}

function pruned(str: string): ArrayBuffer {
  return Buffer.from(str, 'hex').buffer;
}

test('hash tree', async () => {
  const cborEncode = Buffer.from(
    '8301830183024161830183018302417882034568656c6c6f810083024179820345776f726c64' +
      '83024162820344676f6f648301830241638100830241648203476d6f726e696e67',
    'hex',
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
  const tree: Cert.HashTree = cbor.decode(cborEncode);
  expect(tree).toMatchObject(expected);
  expect(await Cert.reconstruct(tree)).toEqual(
    Buffer.from('eb5c5b2195e62d996b84c9bcc8259d19a83786a2f59e0878cec84c811f669aa0', 'hex'),
  );
});

test('pruned hash tree', async () => {
  const cborEncode = Buffer.from(
    '83018301830241618301820458201b4feff9bef8131788b0c9dc6dbad6e81e524249c879e9f1' +
      '0f71ce3749f5a63883024179820345776f726c6483024162820458207b32ac0c6ba8ce35ac' +
      '82c255fc7906f7fc130dab2a090f80fe12f9c2cae83ba6830182045820ec8324b8a1f1ac16' +
      'bd2e806edba78006479c9877fed4eb464a25485465af601d830241648203476d6f726e696e67',
    'hex',
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
  const tree: Cert.HashTree = cbor.decode(cborEncode);
  expect(tree).toMatchObject(expected);
  expect(await Cert.reconstruct(tree)).toEqual(
    Buffer.from('eb5c5b2195e62d996b84c9bcc8259d19a83786a2f59e0878cec84c811f669aa0', 'hex'),
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
  expect(Cert.lookup_path([Buffer.from('a'), Buffer.from('a')], tree)).toEqual(undefined);
  expect(Cert.lookup_path([Buffer.from('a'), Buffer.from('y')], tree)).toEqual(
    Buffer.from('world'),
  );
  expect(Cert.lookup_path([Buffer.from('aa')], tree)).toEqual(undefined);
  expect(Cert.lookup_path([Buffer.from('ax')], tree)).toEqual(undefined);
  expect(Cert.lookup_path([Buffer.from('b')], tree)).toEqual(undefined);
  expect(Cert.lookup_path([Buffer.from('bb')], tree)).toEqual(undefined);
  expect(Cert.lookup_path([Buffer.from('d')], tree)).toEqual(Buffer.from('morning'));
  expect(Cert.lookup_path([Buffer.from('e')], tree)).toEqual(undefined);
});
