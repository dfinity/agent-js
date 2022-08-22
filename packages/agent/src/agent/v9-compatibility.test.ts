import { getNFTActor } from '@psychedelic/dab-js';
import fetch from 'isomorphic-fetch';

import { HttpAgent } from '..';

describe('compatibility with old actor', () => {
  it('should register successfully', () => {
    console.log('foo');

    const agent = new HttpAgent({ fetch, host: 'http:localhost:8000' });
    const actor = getNFTActor({
      canisterId: 'aaa-aaa',
      agent: agent.toLegacyAgent(),
      standard: 'ext',
    });
    expect(actor).toBeTruthy();
  });
});
