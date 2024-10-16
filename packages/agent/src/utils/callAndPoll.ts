import { Principal } from '@dfinity/principal';
import {
  Agent,
  Certificate,
  ContentMap,
  Expiry,
  PartialBy,
  bufFromBufLike,
  polling,
  v3ResponseBody,
} from '..';
import { AgentCallError, AgentError } from '../errors';
import { isArrayBuffer } from 'util/types';
import { DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS } from '../constants';

export type CallAndPollOptions = PartialBy<
  Omit<ContentMap, 'sender' | 'request_type'>,
  'ingress_expiry'
> & {
  agent: Agent;
};

/**
 * Call a canister using the v3 api and either return the response or fall back to polling
 * @param options - The options to use when calling the canister
 * @param options.canister_id - The canister id to call
 * @param options.method_name - The method name to call
 * @param options.agent - The agent to use to make the call
 * @param options.arg - The argument to pass to the canister
 * @returns The certificate response from the canister (which includes the reply)
 */
export async function callAndPoll(options: CallAndPollOptions): Promise<{
  certificate: ArrayBuffer;
  contentMap: ContentMap;
}> {
  assertContentMap(options);
  const { canister_id, method_name, agent, arg } = options;
  const cid = Principal.from(options.canister_id);

  const { defaultStrategy } = polling.strategy;

  if (agent.rootKey == null) throw new Error('Agent root key not initialized before making call');

  const ingress_expiry =
    options.ingress_expiry ?? new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS);

  const contentMap: ContentMap = {
    canister_id: Principal.from(canister_id),
    request_type: 'call',
    method_name: method_name,
    arg,
    sender: await agent.getPrincipal(),
    ingress_expiry,
  };
  const { requestId, response } = await agent.call(cid, {
    methodName: method_name,
    arg,
    effectiveCanisterId: cid,
    ingressExpiry: ingress_expiry,
  });

  if (response.status === 200) {
    if ('body' in response) {
      // Ensure the response body is a v3 response
      assertV3ResponseBody(response.body);

      const cert = response.body.certificate;
      // Create certificate to validate the responses
      const certificate = await Certificate.create({
        certificate: bufFromBufLike(cert),
        rootKey: agent.rootKey,
        canisterId: Principal.from(canister_id),
      });

      return {
        certificate: certificate.rawCert,
        contentMap,
      };
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
    return {
      certificate: response.certificate.rawCert,
      contentMap,
    };
  } else {
    console.error('The network returned a response but the result could not be determined.', {
      response,
      requestId,
    });
    throw new AgentError('unexpected call error: no certificate in response');
  }
}

function assertContentMap(contentMap: unknown): asserts contentMap is ContentMap {
  if (!contentMap || typeof contentMap !== 'object') {
    throw new AgentError('unexpected call error: no contentMap provided for call');
  }
  if (!('canister_id' in contentMap)) {
    throw new AgentError('unexpected call error: no canister_id provided for call');
  }
  if (!('method_name' in contentMap)) {
    throw new AgentError('unexpected call error: no method_name provided for call');
  }
  if (!('arg' in contentMap)) {
    throw new AgentError('unexpected call error: no arg provided for call');
  }
}

function assertV3ResponseBody(body: unknown): asserts body is v3ResponseBody {
  if (!body || typeof body !== 'object') {
    throw new AgentError('unexpected call error: no body in response');
  }
  if (!('certificate' in body)) {
    throw new AgentError('unexpected call error: no certificate in response');
  }
  if (body['certificate'] === undefined || body['certificate'] === null) {
    throw new AgentError('unexpected call error: certificate is not an ArrayBuffer');
  }
  try {
    const cert = bufFromBufLike(body['certificate'] as ArrayBufferLike);
    if (!isArrayBuffer(cert)) {
      throw new AgentError('unexpected call error: certificate is not an ArrayBuffer');
    }
  } catch (error) {
    throw new AgentError('unexpected call error: while presenting certificate: ' + error);
  }
}
