import { getNFTActor, LegacyHttpAgent } from '@psychedelic/dab-js';
import { Principal } from '@dfinity/principal';
import { Principal as LegacyPrincipal } from '@dfinity/principal-legacy';
import fetch from 'isomorphic-fetch';

describe('compatibility with old actor', () => {
  it('should register successfully', async () => {
    console.log('foo');

    const agent = await new LegacyHttpAgent({
      fetch,
      host: 'http:localhost:8000',
    });
    const actor = getNFTActor({
      canisterId: 't2mog-myaaa-aaaal-aas7q-cai',
      agent,
      standard: 'EXT',
    });
    expect(actor).toBeTruthy();
  });
});

describe('principal compatibility', () => {
  it('should support from ', () => {
    LegacyPrincipal.anonymous();
    const test = Principal.from(LegacyPrincipal.anonymous());
    expect(test).toMatchInlineSnapshot(`
      Principal {
        "_arr": Uint8Array [
          4,
        ],
        "_isPrincipal": true,
      }
    `);
  });
});
