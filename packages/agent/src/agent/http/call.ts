import { Principal } from '@dfinity/principal';
import { Identity } from '../../auth';
import { Expiry, httpHeadersTransform } from './transforms';
import {
  CallRequest,
  Endpoint,
  HttpAgentRequest,
  HttpAgentRequestTransformFn,
  HttpHeaderField,
  SubmitRequestType,
} from './types';

import * as cbor from '../../cbor';
import { SubmitResponse } from '../api';
import { AgentError } from '../../errors';
import { RequestId, requestIdOf } from '../../request_id';

const DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS = 5 * 60 * 1000;

export type CallOptions = {
  canisterId: Principal | string;
  callArgs: {
    methodName: string;
    arg: ArrayBuffer;
    effectiveCanisterId?: Principal | string;
  };
  maxTries: number;
  identity: Identity | Promise<Identity>;
  fetchConfig: FetchConfig;
  callOptions?: Record<string, unknown>;
  credentials?: string;
};

export type CallResponse = {
  response: {
    ok: boolean;
    status: number;
    statusText: string;
    body: {
      error_code?: string | undefined;
      reject_code: number;
      reject_message: string;
    } | null;
    headers: HttpHeaderField[];
  };
  requestId: RequestId;
};

export type FetchConfig = {
  body: ArrayBuffer;
  method: string;
  headers: Record<string, string>;
  fetch: typeof fetch;
  host: string;
};

class AgentCallError extends AgentError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Call is a wrapper around a call to a canister.
 * It manages the state of the call and provides
 * methods for retrying the call.
 */
export class Call {
  #options: CallOptions;
  #tries = 0;
  #maxTries = 3;
  #timeDiffMsecs = 0;
  #pipeline: HttpAgentRequestTransformFn[] = [];
  #lastError?: AgentCallError;

  constructor(options: CallOptions) {
    this.#options = options;
  }

  get options() {
    return this.#options;
  }

  get tries() {
    return this.#tries;
  }

  get maxTries() {
    return this.#maxTries;
  }

  public async request(): Promise<CallResponse> {
    this.#tries; //?
    while (this.#tries < this.#maxTries) {
      try {
        return await this.#try();
      } catch (e) {
        console.log(e);
      }
    }
    throw new AgentCallError('Max tries reached');
  }

  async #exponentialBackoff(cb: () => Promise<CallResponse>): Promise<CallResponse> {
    const delay = 2 ** this.#tries * 100;
    delay;
    // await new Promise(resolve => setTimeout(resolve, delay));
    return await cb();
  }

  async #try(): Promise<CallResponse> {
    if (this.#tries >= this.#maxTries) {
      if (this.#lastError) {
        throw this.#lastError;
      }
      throw new AgentCallError('Max tries reached');
    }
    this.#tries++;

    const { canisterId, identity, callArgs, credentials, fetchConfig, callOptions } = this.#options;

    const id = await identity;

    const canister = Principal.from(canisterId);
    const ecid = callArgs.effectiveCanisterId
      ? Principal.from(callArgs.effectiveCanisterId)
      : canister;

    const sender: Principal = id.getPrincipal() || Principal.anonymous();

    const ingress_expiry = new Expiry(
      DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS,
      BigInt(this.#timeDiffMsecs),
    );

    const submit: CallRequest = {
      request_type: SubmitRequestType.Call,
      canister_id: canister,
      method_name: callArgs.methodName,
      arg: callArgs.arg,
      sender,
      ingress_expiry,
    };

    let transformedRequest = await this.#transform({
      request: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/cbor',
          ...(credentials ? { Authorization: 'Basic ' + btoa(credentials) } : {}),
        },
      },
      endpoint: Endpoint.Call,
      body: submit,
    });

    transformedRequest = (await id.transformRequest(transformedRequest)) as HttpAgentRequest;

    const body = cbor.encode(transformedRequest.body);

    const { host } = fetchConfig;

    return fetch('' + new URL(`/api/v2/canister/${ecid.toText()}/call`, host), {
      ...callOptions,
      ...transformedRequest.request,
      body,
    } as RequestInit)
      .then(async response => {
        if (response.status === 401) {
          console.log(response.status, response.statusText);
          throw new Error('Unauthorized');
        }

        if (response.status === 404) {
          console.log(response.status, response.statusText);
          throw new Error('Canister not found');
        }

        if (!response.ok) {
          this.#lastError = new AgentCallError(
            `Server returned an error:\n` +
              `  Code: ${response.status} (${response.statusText})\n` +
              `  Body: ${await response.clone().text()}\n`,
          );

          const responseText = await response.clone().text();

          // Handle time drift errors
          if (responseText.includes('Specified ingress_expiry')) {
            const errorParts = responseText.split(': ');
            errorParts;
            const minExpiry = new Date(errorParts[2].split(',')[0].trim()); //?
            const maxExpiry = new Date(errorParts[3].split(',')[0].trim()); //?
            const providedExpiry = new Date(errorParts[4].trim()); //?

            const result = {
              minimum: minExpiry,
              maximum: maxExpiry,
              provided: providedExpiry,
            };

            console.log(
              'HttpAgent has detected a disagreement about time with the replica. Retrying with adjusted expiry.',
              result,
            );
            // Adjust the time difference to account for the time it took to make the request.
            this.#timeDiffMsecs = maxExpiry.getTime() - Date.now() - 1000;
            console.log('Adjusted time difference to', this.#timeDiffMsecs, 'milliseconds.');
          }
        }

        const responseBuffer = await response.arrayBuffer();
        const responseBody = (
          response.status === 200 && responseBuffer.byteLength > 0
            ? cbor.decode(responseBuffer)
            : null
        ) as SubmitResponse['response']['body'];

        const requestId = requestIdOf(submit);

        return {
          response: {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            body: responseBody,
            headers: httpHeadersTransform(response.headers),
          },
          requestId,
        };
      })
      .catch(e => {
        console.log(e);
        throw e;
      });
  }

  #transform = async (request: HttpAgentRequest): Promise<HttpAgentRequest> => {
    let p = Promise.resolve(request);

    for (const fn of this.#pipeline) {
      p = p.then(r => fn(r).then(r2 => r2 || r));
    }

    return p;
  };
}
