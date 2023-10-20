import { HttpAgent, HttpAgentOptions } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';

export const identity = Ed25519KeyIdentity.generate();
export const principal = identity.getPrincipal();

export const port = parseInt(process.env['REPLICA_PORT'] || '4943', 10);
if (Number.isNaN(port)) {
  throw new Error('The environment variable REPLICA_PORT is not a number.');
}

export const makeAgent = async (options?: HttpAgentOptions) => {
  const agent = new HttpAgent({
    host: `http://localhost:${process.env.REPLICA_PORT ?? 4943}`,
    verifyQuerySignatures: false,
    ...options,
  });
  await agent.fetchRootKey();
  return agent;
};

const agent = makeAgent();

export default agent;
