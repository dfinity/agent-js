import { Agent, RequestStatusResponseStatus } from '../agent';
import { Certificate } from '../certificate';
import { Principal } from '../principal';
import { RequestId, toHex as requestIdToHex } from '../request_id';
import { BinaryBlob, blobFromText } from '../types';

export * as strategy from './strategy';
export type PollStrategy = (
  canisterId: Principal,
  requestId: RequestId,
  status: RequestStatusResponseStatus,
) => Promise<void>;

/**
 * Polls the IC to check the status of the given request then
 * returns the response bytes once the request has been processed.
 * @param agent The agent to use to poll read_state.
 * @param canisterId The effective canister ID.
 * @param requestId The Request ID to poll status for.
 * @param strategy A polling strategy.
 */
export async function pollForResponse(
  agent: Agent,
  canisterId: Principal,
  requestId: RequestId,
  strategy: PollStrategy,
): Promise<BinaryBlob> {
  const path = [blobFromText('request_status'), requestId];
  const state = await agent.readState(canisterId, { paths: [path] });
  const cert = new Certificate(state, agent);
  const verified = await cert.verify();
  if (!verified) {
    throw new Error('Fail to verify certificate');
  }
  const maybeBuf = cert.lookup([...path, blobFromText('status')]);
  let status;
  if (typeof maybeBuf === 'undefined') {
    // Missing requestId means we need to wait
    status = RequestStatusResponseStatus.Unknown;
  } else {
    status = maybeBuf.toString();
  }

  switch (status) {
    case RequestStatusResponseStatus.Replied: {
      return cert.lookup([...path, blobFromText('reply')]) as BinaryBlob;
    }

    case RequestStatusResponseStatus.Received:
    case RequestStatusResponseStatus.Unknown:
    case RequestStatusResponseStatus.Processing:
      // Execute the polling strategy, then retry.
      await strategy(canisterId, requestId, status);
      return pollForResponse(agent, canisterId, requestId, strategy);

    case RequestStatusResponseStatus.Rejected: {
      const rejectCode = cert.lookup([...path, blobFromText('reject_code')])!.toString();
      const rejectMessage = cert.lookup([...path, blobFromText('reject_message')])!.toString();
      throw new Error(
        `Call was rejected:\n` +
          `  Request ID: ${requestIdToHex(requestId)}\n` +
          `  Reject code: ${rejectCode}\n` +
          `  Reject text: ${rejectMessage}\n`,
      );
    }

    case RequestStatusResponseStatus.Done:
      // This is _technically_ not an error, but we still didn't see the `Replied` status so
      // we don't know the result and cannot decode it.
      throw new Error(
        `Call was marked as done but we never saw the reply:\n` +
          `  Request ID: ${requestIdToHex(requestId)}\n`,
      );
  }
  throw new Error('unreachable');
}
