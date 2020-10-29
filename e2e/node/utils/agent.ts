import {
  HttpAgent,
  Principal,
  generateKeyPair,
  makeAuthTransform,
  makeNonceTransform,
} from '@dfinity/agent';

const keyPair = generateKeyPair();
const principal = Principal.selfAuthenticating(keyPair.publicKey);

const agent = new HttpAgent({ host: 'http://127.0.0.1:8001', principal });
agent.addTransform(makeNonceTransform());
agent.setAuthTransform(makeAuthTransform(keyPair));

export default agent;
