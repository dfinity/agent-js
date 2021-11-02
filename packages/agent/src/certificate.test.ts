/**
 * Need this to setup the proper ArrayBuffer type (otherwise in Jest ArrayBuffer isn't
 * an instance of ArrayBuffer).
 * @jest-environment node
 */
import * as cbor from './cbor';
import * as Cert from './certificate';
import { fromHex, toHex } from './utils/buffer';

function label(str: string): ArrayBuffer {
  return new TextEncoder().encode(str);
}

function pruned(str: string): ArrayBuffer {
  return fromHex(str);
}

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
  expect(toText(Cert.lookup_path([fromText('a'), fromText('y')], tree))).toEqual('world');
  expect(Cert.lookup_path([fromText('aa')], tree)).toEqual(undefined);
  expect(Cert.lookup_path([fromText('ax')], tree)).toEqual(undefined);
  expect(Cert.lookup_path([fromText('b')], tree)).toEqual(undefined);
  expect(Cert.lookup_path([fromText('bb')], tree)).toEqual(undefined);
  expect(toText(Cert.lookup_path([fromText('d')], tree))).toEqual('morning');
  expect(Cert.lookup_path([fromText('e')], tree)).toEqual(undefined);
});
