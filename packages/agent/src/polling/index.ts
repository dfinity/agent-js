import { RequestId } from '../request_id';
import { bufFromBufLike, strToUtf8, toHex } from '../utils/buffer';
import { CreateCertificateOptions, Certificate, lookupResultToBuffer } from '../certificate';
import { Agent } from '../agent/api';
import { Principal } from '@dfinity/principal';

export * as strategy from './strategy';
import { defaultStrategy } from './strategy';
import { ReadRequestType, ReadStateRequest } from '../agent/http/types';
import { CreateReadStateRequestError } from '../errors';
import { RequestStatusResponseStatus } from '../agent';
export { defaultStrategy } from './strategy';

export type PollStrategy = (
  canisterId: Principal,
  requestId: RequestId,
  status: RequestStatusResponseStatus,
) => Promise<void>;

export type PollStrategyFactory = () => PollStrategy;

interface SignedReadStateRequestWithExpiry extends ReadStateRequest {
  body: {
    content: Pick<ReadStateRequest, 'request_type' | 'ingress_expiry'>;
  };
}

/**
 * Options for controlling polling behavior
 */
export interface PollingOptions {
  /**
   * A polling strategy that dictates how much and often we should poll the
   * read_state endpoint to get the result of an update call.
   * @default defaultStrategy()
   */
  strategy?: PollStrategy;

  /**
   * Whether to reuse the same signed request for polling or create a new unsigned request each time.
   * @default false
   */
  preSignReadStateRequest?: boolean;

  /**
   * Optional replacement function that verifies the BLS signature of a certificate.
   */
  blsVerify?: CreateCertificateOptions['blsVerify'];

  /**
   * The request to use for polling. If not provided, a new request will be created.
   * This is only used if `preSignReadStateRequest` is set to false.
   */
  request?: ReadStateRequest;
}

/**
 * Check if an object has a property
 * @param value the object that might have the property
 * @param property the key of property we're looking for
 */
function hasProperty<O extends object, P extends string>(
  value: O,
  property: P,
): value is O & Record<P, unknown> {
  return Object.prototype.hasOwnProperty.call(value, property);
}

/**
 * Check if value is a signed read state request with expiry
 * @param value to check
 */
function isSignedReadStateRequestWithExpiry(
  value: unknown,
): value is SignedReadStateRequestWithExpiry {
  return (
    value !== null &&
    typeof value === 'object' &&
    hasProperty(value, 'body') &&
    value.body !== null &&
    typeof value.body === 'object' &&
    hasProperty(value.body, 'content') &&
    value.body.content !== null &&
    typeof value.body.content === 'object' &&
    hasProperty(value.body.content, 'request_type') &&
    value.body.content.request_type === ReadRequestType.ReadState &&
    hasProperty(value.body.content, 'ingress_expiry') &&
    typeof value.body.content.ingress_expiry === 'object' &&
    value.body.content.ingress_expiry !== null &&
    hasProperty(value.body.content.ingress_expiry, 'toCBOR') &&
    typeof value.body.content.ingress_expiry.toCBOR === 'function' &&
    hasProperty(value.body.content.ingress_expiry, 'toHash') &&
    typeof value.body.content.ingress_expiry.toHash === 'function'
  );
}

/**
 * Polls the IC to check the status of the given request then
 * returns the response bytes once the request has been processed.
 * @param agent The agent to use to poll read_state.
 * @param canisterId The effective canister ID.
 * @param requestId The Request ID to poll status for.
 * @param options polling options to control behavior
 */
export async function pollForResponse(
  agent: Agent,
  canisterId: Principal,
  requestId: RequestId,
  options: PollingOptions = {},
): Promise<{
  certificate: Certificate;
  reply: ArrayBuffer;
}> {
  const encode = (str: string) => strToUtf8(str);
  const path = [encode('request_status'), requestId];

  // Determine if we should reuse the read state request or create a new one
  // based on the options provided.
  async function constructRequest(paths: ArrayBuffer[][]): Promise<ReadStateRequest> {
    if (options.request && isSignedReadStateRequestWithExpiry(options.request)) {
      return options.request;
    }
    const request = await agent.createReadStateRequest?.(
      {
        paths,
      },
      undefined,
    );
    if (!isSignedReadStateRequestWithExpiry(request)) {
      throw new CreateReadStateRequestError('Invalid read state request', request);
    }
    return request;
  }

  let state;
  let currentRequest: ReadStateRequest | undefined = undefined;
  const preSignReadStateRequest = options.preSignReadStateRequest ?? false;
  if (preSignReadStateRequest) {
    // If preSignReadStateRequest is true, we need to create a new request
    currentRequest = await constructRequest([path]);  
    state = await agent.readState(canisterId, { paths: [path] }, undefined, currentRequest);
  } else {
    // If preSignReadStateRequest is false, we use the default strategy and sign the request each time
    state = await agent.readState(canisterId, { paths: [path] });
  }

  if (agent.rootKey == null) throw new Error('Agent root key not initialized before polling');
  const cert = await Certificate.create({
    certificate: state.certificate,
    rootKey: agent.rootKey,
    canisterId: canisterId,
    blsVerify: options.blsVerify,
  });

  const maybeBuf = lookupResultToBuffer(cert.lookup([...path, encode('status')]));
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
    case RequestStatusResponseStatus.Processing: {
      // Execute the polling strategy, then retry.
      const strategy = options.strategy ?? defaultStrategy();
      await strategy(canisterId, requestId, status);
      return pollForResponse(agent, canisterId, requestId, {
        ...options,
        request: currentRequest,
      });
    }

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
