import { getNFTActor } from '@psychedelic/dab-js';
import fetch from 'isomorphic-fetch';

import { HttpAgent } from '..';

describe('compatibility with old actor', () => {
  it('should register successfully', async () => {
    console.log('foo');

    const agent = await new HttpAgent({ fetch, host: 'http:localhost:8000' }).toLegacyAgent();
    const actor = getNFTActor({
      canisterId: 'aaa-aaa',
      agent,
      standard: 'ext',
    });
    expect(actor).toBeTruthy();
  });
});
