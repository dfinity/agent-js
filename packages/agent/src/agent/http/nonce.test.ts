import { Principal } from '@dfinity/principal';
import { HttpAgent, makeNonce, Nonce } from './index';
import * as cbor from '../../cbor';
import { IDL } from '@dfinity/candid';
import { assert } from 'console';
import { QueryResponseStatus } from '../api';

describe('Nonce Generation', () => {
  it('should generate a uint8array', () => {
    const nonce = makeNonce();

    expect(nonce).toBeInstanceOf(Uint8Array);
    expect(Object.hasOwn(nonce, '__nonce__')).toBe(true);
  });

  it('should provide a nonce when passed to an agent query', async () => {
    const expectedReplyArg = IDL.encode([IDL.Text], ['Hello, World!']);
    const nonce = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;
    const mockFetch = jest.fn(() => {
      return Promise.resolve(
        new Response(
          cbor.encode({
            status: 'replied',
            reply: {
              arg: expectedReplyArg,
            },
          }),
          {
            status: 200,
            statusText: 'ok',
          },
        ),
      );
    });
    const agent = HttpAgent.createSync({
      fetch: mockFetch,
      host: 'http://127.0.0.1',
      verifyQuerySignatures: false,
    });
    const canisterId = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');

    const response = await agent.query(canisterId, {
      methodName: 'read_state',
      arg: new ArrayBuffer(0),
      nonce,
    });
    assert(response.status === QueryResponseStatus.Replied);
    expect(response.requestDetails?.nonce).toBe(nonce);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should provide a nonce when passed to an agent call', async () => {
    const expectedReplyArg = IDL.encode([IDL.Text], ['Hello, World!']);
    const nonce = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]) as Nonce;
    const mockFetch = jest.fn(() => {
      return Promise.resolve(
        new Response(
          cbor.encode({
            status: 'replied',
            reply: {
              arg: expectedReplyArg,
            },
          }),
          {
            status: 200,
            statusText: 'ok',
          },
        ),
      );
    });
    const agent = HttpAgent.createSync({
      fetch: mockFetch,
      host: 'http://127.0.0.1',
      verifyQuerySignatures: false,
    });
    const canisterId = Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c');

    const { response, requestDetails } = await agent.call(canisterId, {
      methodName: 'read_state',
      arg: new ArrayBuffer(0),
      nonce,
    });

    expect(response.status).toBe(200);
    expect(requestDetails?.nonce).toBe(nonce);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
