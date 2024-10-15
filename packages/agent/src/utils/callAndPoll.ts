import { Principal } from '@dfinity/principal';
import {
  Agent,
  Certificate,
  ContentMap,
  Expiry,
  bufFromBufLike,
  polling,
  v3ResponseBody,
} from '..';
import { AgentCallError, AgentError } from '../errors';
import { isArrayBuffer } from 'util/types';

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
  ingressExpiry?: Expiry;
}): Promise<{
  certificate: ArrayBuffer;
  contentMap: ContentMap;
}> {
  const { canisterId, methodName, agent, arg } = options;
  const cid = Principal.from(options.canisterId);

  const { defaultStrategy } = polling.strategy;

  if (agent.rootKey == null) throw new Error('Agent root key not initialized before making call');

  const ingress_expiry = options.ingressExpiry ?? new Expiry(DEFAULT);

  const { requestId, response } = await agent.call(cid, {
    methodName,
    arg,
    effectiveCanisterId: cid,
  });
  const contentMap: ContentMap = {
    canister_id: Principal.from(canisterId),
    request_type: 'call',
    method_name: methodName,
    arg,
    sender: await agent.getPrincipal(),
    ingress_expiry,
  };

  if (response.status === 200) {
    if ('body' in response) {
      // Ensure the response body is a v3 response
      assertV3ResponseBody(response.body);

      const cert = response.body.certificate;
      // Create certificate to validate the responses
      const certificate = await Certificate.create({
        certificate: bufFromBufLike(cert),
        rootKey: agent.rootKey,
        canisterId: Principal.from(canisterId),
      });

      return certificate.rawCert;
    } else {
      throw new AgentCallError(
        'unexpected call error: no certificate in response',
        response,
        requestId,
      );
    }
  }
  // Fall back to polling if we recieve an Accepted response code
  else if (response.status === 202) {
    const pollStrategy = defaultStrategy();
    // Contains the certificate and the reply from the boundary node
    const response = await polling.pollForResponse(agent, cid, requestId, pollStrategy);
    return response.certificate.rawCert;
  } else {
    console.error('The network returned a response but the result could not be determined.', {
      response,
      requestId,
    });
    throw new AgentError('unexpected call error: no certificate in response');
  }
}

function assertV3ResponseBody(body: unknown): asserts body is v3ResponseBody {
  if (!body || typeof body !== 'object') {
    throw new AgentError('unexpected call error: no body in response');
  }
  if (!('certificate' in body)) {
    throw new AgentError('unexpected call error: no certificate in response');
  }
  if (!isArrayBuffer(body['certificate'])) {
    throw new AgentError('unexpected call error: certificate is not an ArrayBuffer');
  }
}
