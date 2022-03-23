import { HttpAgent, makeNonceTransform } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';

const identity = Ed25519KeyIdentity.generate();
export const principal = identity.getPrincipal();

const port = parseInt(process.env['REPLICA_PORT'] || '', 10);
if (Number.isNaN(port)) {
  throw new Error('The environment variable REPLICA_PORT is not a number.');
}

const agent = Promise.resolve(new HttpAgent({ host: 'http://127.0.0.1:' + port, identity })).then(
  async agent => {
    await agent.fetchRootKey();
    agent.addTransform(makeNonceTransform());
    return agent;
  },
);

export default agent;
