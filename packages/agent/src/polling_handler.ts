import { Agent, RequestStatusResponseStatus } from './agent';
import { Certificate } from './certificate';
import { Principal } from './principal';
import { RequestId, toHex as requestIdToHex } from './request_id';
import { BinaryBlob, blobFromText } from './types';

// Polls the IC to check the status of the given request then
// returns the response bytes once the request has been processed.
export async function pollForResponse(
    agent: Agent,
    canisterId: Principal | string,
    requestId: RequestId,
    attempts: number,
    maxAttempts: number,
    throttle: number,
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
            if (--attempts <= 0) {
                throw new Error(
                    `Failed to retrieve a reply for request after ${maxAttempts} attempts:\n` +
                    `  Request ID: ${requestIdToHex(requestId)}\n` +
                    `  Request status: ${status}\n`,
                );
            }

            // Wait a little, then retry.
            return new Promise(resolve => setTimeout(resolve, throttle)).then(() =>
                pollForResponse(
                    agent,
                    canisterId,
                    requestId,
                    attempts,
                    maxAttempts,
                    throttle,
                ),
            );

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
