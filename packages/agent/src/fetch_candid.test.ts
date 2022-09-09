import { fetchCandid, HttpAgent } from '.';
import { IDL } from '@dfinity/candid';
import * as cbor from './cbor';

test('simulate fetching a Candid interface', async () => {
  const mockFetch = jest.fn().mockImplementationOnce((/*resource, init*/) => {
    return Promise.resolve(
      new Response(
        cbor.encode({
          status: 'replied',
          reply: {
            arg: IDL.encode([IDL.Text], ['service {}']),
          },
        }),
        {
          status: 200,
        },
      ),
    );
  });

  const agent = new HttpAgent({ fetch: mockFetch, host: 'http://localhost' });

  const candid = await fetchCandid(agent, 'ryjl3-tyaaa-aaaaa-aaaba-cai');

  expect(candid).toMatch(/service/);
});
