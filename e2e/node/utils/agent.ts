import { HttpAgent, HttpAgentOptions } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import fetch from 'isomorphic-fetch';

export const identity = Ed25519KeyIdentity.generate();
export const principal = identity.getPrincipal();

export const port = parseInt(process.env['REPLICA_PORT'] || '4943', 10);
if (Number.isNaN(port)) {
  throw new Error('The environment variable REPLICA_PORT is not a number.');
}

export const makeAgent = async (options?: HttpAgentOptions) => {
  const agent = new HttpAgent({
    host: `http://127.0.0.1:${process.env.REPLICA_PORT ?? 4943}`,
    fetch: global.fetch ?? fetch,
    verifyQuerySignatures: false,
    ...options,
  });
  try {
    await agent.fetchRootKey();
  } catch (_) {
    //
  }
  return agent;
};

const agent = makeAgent();

export default agent;
