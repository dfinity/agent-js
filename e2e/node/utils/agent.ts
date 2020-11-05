import {
  HttpAgent,
  Principal,
  generateKeyPair,
  makeAuthTransform,
  makeNonceTransform,
} from "@dfinity/agent";

const keyPair = generateKeyPair();
export const principal = Principal.selfAuthenticating(keyPair.publicKey);

const port = parseInt(process.env["IC_REF_PORT"] || "", 10);
if (Number.isNaN(port)) {
  throw new Error("The environment variable IC_REF_PORT is not a number.");
}

const agent = new HttpAgent({ host: "http://127.0.0.1:" + port, principal });
agent.addTransform(makeNonceTransform());
agent.setAuthTransform(makeAuthTransform(keyPair));

export default agent;
