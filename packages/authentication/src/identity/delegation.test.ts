import { BinaryBlob, blobFromHex, SignIdentity } from '@dfinity/agent';
import BigNumber from 'bignumber.js';
import { createDelegation } from './delegation';
import { Ed25519KeyIdentity } from './ed25519';

function createIdentity(seed: number): SignIdentity {
  const s = new Uint8Array([seed, ...new Array(31).fill(0)]);
  return Ed25519KeyIdentity.generate(s);
}

function h(text: TemplateStringsArray): BinaryBlob {
  return blobFromHex(text.join(''));
}

test('delegation signs with proper keys (3)', async () => {
  const root = createIdentity(2);
  const middle = createIdentity(1);
  const bottom = createIdentity(0);

  const rootToMiddle = await createDelegation(root, middle, {
    expiration: new Date(1609459200000),
  });
  const middleToBottom = await createDelegation(middle, bottom, {
    expiration: new Date(1609459200000),
    previous: rootToMiddle,
  });

  const golden = {
    sender_delegation: [
      {
        delegation: {
          expiration: new BigNumber('1609459200000000000'),
          pubkey: h`302A300506032B6570032100CECC1507DC1DDD7295951C290888F095ADB9044D1B73D696E6DF065D683BD4FC`,
        },
        signature: h`B106D135E5AD7459DC67DB68A4946FDBE603E650DF4035957DB7F0FB54E7467BB463116A2AD025E1887CD1F29025E0F3607B09924ABBBBEBFAF921B675C8FF08`,
      },
      {
        delegation: {
          expiration: new BigNumber('1609459200000000000'),
          pubkey: h`302A300506032B65700321003B6A27BCCEB6A42D62A3A8D02A6F0D73653215771DE243A63AC048A18B59DA29`,
        },
        signature: h`5E40F3D171E499A691092E5B961B5447921091BCF8C6409CB5641541F4DC1390F501C5DFB16B10DF29D429CD153B9E396AF4E883ED3CFA090D28E214DB14C308`,
      },
    ],
    sender_pubkey: h`302A300506032B65700321006B79C57E6A095239282C04818E96112F3F03A4001BA97A564C23852A3F1EA5FC`,
  };

  expect(middleToBottom).toEqual(golden);
});
