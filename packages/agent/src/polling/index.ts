import { Principal } from '@dfinity/principal';
import { Agent, HttpAgent, RequestStatusResponseStatus } from '../agent';
import { Certificate, CreateCertificateOptions, lookupResultToBuffer } from '../certificate';
import { RequestId } from '../request_id';
import { toHex } from '../utils/buffer';

export * as strategy from './strategy';
import { defaultStrategy } from './strategy';
export { defaultStrategy } from './strategy';
export type PollStrategy = (
  canisterId: Principal,
  requestId: RequestId,
  status: RequestStatusResponseStatus,
) => Promise<void>;
export type PollStrategyFactory = () => PollStrategy;

/**
 * Polls the IC to check the status of the given request then
 * returns the response bytes once the request has been processed.
 * @param agent The agent to use to poll read_state.
 * @param canisterId The effective canister ID.
 * @param requestId The Request ID to poll status for.
 * @param strategy A polling strategy.
 * @param request Request for the readState call.
 * @param blsVerify - optional replacement function that verifies the BLS signature of a certificate.
 */
export async function pollForResponse(
  agent: Agent,
  canisterId: Principal,
  requestId: RequestId,
  strategy: PollStrategy = defaultStrategy(),
  // eslint-disable-next-line
  request?: any,
  blsVerify?: CreateCertificateOptions['blsVerify'],
): Promise<{
  certificate: Certificate;
  reply: ArrayBuffer;
}> {
  const path = [new TextEncoder().encode('request_status'), requestId];
  const currentRequest = request ?? (await agent.createReadStateRequest?.({ paths: [path] }));
  const state = await agent.readState(canisterId, { paths: [path] }, undefined, currentRequest);
  if (agent.rootKey == null) throw new Error('Agent root key not initialized before polling');

  // if agent has replicaTime, otherwise omit
  const certTime = (agent as HttpAgent)?.replicaTime
    ? (agent as HttpAgent)?.replicaTime
    : undefined;

  const cert = await Certificate.create({
    certificate: state.certificate,
    rootKey: agent.rootKey,
    canisterId: canisterId,
    certTime: certTime,
    blsVerify,
  });

  const maybeBuf = lookupResultToBuffer(cert.lookup([...path, new TextEncoder().encode('status')]));
  let status;
  if (typeof maybeBuf === 'undefined') {
    // Missing requestId means we need to wait
    status = RequestStatusResponseStatus.Unknown;
  } else {
    status = new TextDecoder().decode(maybeBuf);
  }

  switch (status) {
    case RequestStatusResponseStatus.Replied: {
      return {
        reply: lookupResultToBuffer(cert.lookup([...path, 'reply']))!,
        certificate: cert,
      };
    }

    case RequestStatusResponseStatus.Received:
    case RequestStatusResponseStatus.Unknown:
    case RequestStatusResponseStatus.Processing:
      // Execute the polling strategy, then retry.
      await strategy(canisterId, requestId, status);
      return pollForResponse(agent, canisterId, requestId, strategy, currentRequest, blsVerify);

    case RequestStatusResponseStatus.Rejected: {
      const rejectCode = new Uint8Array(
        lookupResultToBuffer(cert.lookup([...path, 'reject_code']))!,
      )[0];
      const rejectMessage = new TextDecoder().decode(
        lookupResultToBuffer(cert.lookup([...path, 'reject_message']))!,
      );
      throw new Error(
        `Call was rejected:\n` +
          `  Request ID: ${toHex(requestId)}\n` +
          `  Reject code: ${rejectCode}\n` +
          `  Reject text: ${rejectMessage}\n`,
      );
    }

    case RequestStatusResponseStatus.Done:
      // This is _technically_ not an error, but we still didn't see the `Replied` status so
      // we don't know the result and cannot decode it.
      throw new Error(
        `Call was marked as done but we never saw the reply:\n` +
          `  Request ID: ${toHex(requestId)}\n`,
      );
  }
  throw new Error('unreachable');
}
