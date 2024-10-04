import { Principal } from '@dfinity/principal';
import { Agent, Certificate, bufFromBufLike, polling } from '..';
import { AgentError } from '../errors';

/**
 * Call a canister using the v3 api and either return the response or fall back to polling
 * @param options - The options to use when calling the canister
 * @param options.canisterId - The canister id to call
 * @param options.methodName - The method name to call
 * @param options.agent - The agent to use to make the call
 * @param options.arg - The argument to pass to the canister
 * @returns The certificate response from the canister (which includes the reply)
 */
export async function callAndPoll(options: {
  canisterId: Principal | string;
  methodName: string;
  agent: Agent;
  arg: ArrayBuffer;
}): Promise<ArrayBuffer> {
  const { canisterId, methodName, agent, arg } = options;
  const cid = Principal.from(options.canisterId);

  const { defaultStrategy } = polling.strategy;

  if (agent.rootKey == null) throw new Error('Agent root key not initialized before making call');

  const { requestId, response } = await agent.call(cid, {
    methodName,
    arg,
    effectiveCanisterId: cid,
  });

  let certificate: Certificate;
  if (response.body && response.body.certificate) {
    const cert = response.body.certificate;
    // Create certificate to validate the responses
    certificate = await Certificate.create({
      certificate: bufFromBufLike(cert),
      rootKey: agent.rootKey,
      canisterId: Principal.from(canisterId),
    });
  } else {
    throw new AgentError('unexpected call error: no certificate in response');
  }
  // Fall back to polling if we recieve an Accepted response code
  if (response.status === 202) {
    const pollStrategy = defaultStrategy();
    // Contains the certificate and the reply from the boundary node
    const response = await polling.pollForResponse(agent, cid, requestId, pollStrategy);
    certificate = response.certificate;
  }

  return certificate.rawCert;
}
