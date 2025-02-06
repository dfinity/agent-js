import { JsonObject } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { AgentError } from '../../errors';
import { AnonymousIdentity, Identity } from '../../auth';
import * as cbor from '../../cbor';
import { RequestId, hashOfMap, requestIdOf } from '../../request_id';
import { bufFromBufLike, concat, fromHex, toHex } from '../../utils/buffer';
import {
  Agent,
  ApiQueryResponse,
  HttpDetailsResponse,
  QueryFields,
  QueryResponse,
  ReadStateOptions,
  ReadStateResponse,
  SubmitResponse,
  v3ResponseBody,
} from '../api';
import { Expiry, httpHeadersTransform, makeNonceTransform } from './transforms';
import {
  CallRequest,
  Endpoint,
  HttpAgentRequest,
  HttpAgentRequestTransformFn,
  HttpAgentSubmitRequest,
  makeNonce,
  Nonce,
  QueryRequest,
  ReadRequestType,
  SubmitRequestType,
} from './types';
import { AgentCallError, AgentHTTPResponseError, AgentQueryError } from './errors';
import { SubnetStatus, request } from '../../canisterStatus';
import {
  CertificateVerificationError,
  HashTree,
  LookupStatus,
  lookup_path,
} from '../../certificate';
import { ed25519 } from '@noble/curves/ed25519';
import { ExpirableMap } from '../../utils/expirableMap';
import { Ed25519PublicKey } from '../../public_key';
import { decodeTime } from '../../utils/leb';
import { ObservableLog } from '../../observable';
import { BackoffStrategy, BackoffStrategyFactory, ExponentialBackoff } from '../../polling/backoff';
import { DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS } from '../../constants';
export * from './transforms';
export * from './errors';
export { Nonce, makeNonce } from './types';

export enum RequestStatusResponseStatus {
  Received = 'received',
  Processing = 'processing',
  Replied = 'replied',
  Rejected = 'rejected',
  Unknown = 'unknown',
  Done = 'done',
}

const MINUTE_TO_MSECS = 60 * 1000;

// Root public key for the IC, encoded as hex
export const IC_ROOT_KEY =
  '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100814' +
  'c0e6ec71fab583b08bd81373c255c3c371b2e84863c98a4f1e08b74235d14fb5d9c0cd546d968' +
  '5f913a0c0b2cc5341583bf4b4392e467db96d65b9bb4cb717112f8472e0d5a4d14505ffd7484' +
  'b01291091c5f87b98883463f98091a0baaae';

export const MANAGEMENT_CANISTER_ID = 'aaaaa-aa';

// IC0 domain info
const IC0_DOMAIN = 'ic0.app';
const IC0_SUB_DOMAIN = '.ic0.app';

const ICP0_DOMAIN = 'icp0.io';
const ICP0_SUB_DOMAIN = '.icp0.io';

const ICP_API_DOMAIN = 'icp-api.io';
const ICP_API_SUB_DOMAIN = '.icp-api.io';

class HttpDefaultFetchError extends AgentError {
  constructor(public readonly message: string) {
    super(message);
  }
}
export class IdentityInvalidError extends AgentError {
  constructor(public readonly message: string) {
    super(message);
  }
}

// HttpAgent options that can be used at construction.
export interface HttpAgentOptions {
  // A surrogate to the global fetch function. Useful for testing.
  fetch?: typeof fetch;

  // Additional options to pass along to fetch. Will not override fields that
  // the agent already needs to set
  // Should follow the RequestInit interface, but we intentially support non-standard fields
  fetchOptions?: Record<string, unknown>;

  // Additional options to pass along to fetch for the call API.
  callOptions?: Record<string, unknown>;

  // The host to use for the client. By default, uses the same host as
  // the current page.
  host?: string;

  // The principal used to send messages. This cannot be empty at the request
  // time (will throw).
  identity?: Identity | Promise<Identity>;

  /**
   * The maximum time a request can be delayed before being rejected.
   * @default 5 minutes
   */
  ingressExpiryInMinutes?: number;

  credentials?: {
    name: string;
    password?: string;
  };
  /**
   * Adds a unique {@link Nonce} with each query.
   * Enabling will prevent queries from being answered with a cached response.
   * @example
   * const agent = new HttpAgent({ useQueryNonces: true });
   * agent.addTransform(makeNonceTransform(makeNonce);
   * @default false
   */
  useQueryNonces?: boolean;
  /**
   * Number of times to retry requests before throwing an error
   * @default 3
   */
  retryTimes?: number;
  /**
   * The strategy to use for backoff when retrying requests
   */
  backoffStrategy?: BackoffStrategyFactory;
  /**
   * Whether the agent should verify signatures signed by node keys on query responses. Increases security, but adds overhead and must make a separate request to cache the node keys for the canister's subnet.
   * @default true
   */
  verifyQuerySignatures?: boolean;
  /**
   * Whether to log to the console. Defaults to false.
   */
  logToConsole?: boolean;

  /**
   * Alternate root key to use for verifying certificates. If not provided, the default IC root key will be used.
   */
  rootKey?: ArrayBuffer;

  /**
   * Whether or not the root key should be automatically fetched during construction.
   */
  shouldFetchRootKey?: boolean;
}

function getDefaultFetch(): typeof fetch {
  let defaultFetch;

  if (typeof window !== 'undefined') {
    // Browser context
    if (window.fetch) {
      defaultFetch = window.fetch.bind(window);
    } else {
      throw new HttpDefaultFetchError(
        'Fetch implementation was not available. You appear to be in a browser context, but window.fetch was not present.',
      );
    }
  } else if (typeof global !== 'undefined') {
    // Node context
    if (global.fetch) {
      defaultFetch = global.fetch.bind(global);
    } else {
      throw new HttpDefaultFetchError(
        'Fetch implementation was not available. You appear to be in a Node.js context, but global.fetch was not available.',
      );
    }
  } else if (typeof self !== 'undefined') {
    if (self.fetch) {
      defaultFetch = self.fetch.bind(self);
    }
  }

  if (defaultFetch) {
    return defaultFetch;
  }
  throw new HttpDefaultFetchError(
    'Fetch implementation was not available. Please provide fetch to the HttpAgent constructor, or ensure it is available in the window or global context.',
  );
}

function determineHost(configuredHost: string | undefined): string {
  let host: URL;
  if (configuredHost !== undefined) {
    if (!configuredHost.match(/^[a-z]+:/) && typeof window !== 'undefined') {
      host = new URL(window.location.protocol + '//' + configuredHost);
    } else {
      host = new URL(configuredHost);
    }
  } else {
    // Mainnet, local, and remote environments will have the api route available
    const knownHosts = ['ic0.app', 'icp0.io', '127.0.0.1', 'localhost'];
    const remoteHosts = ['.github.dev', '.gitpod.io'];
    const location = typeof window !== 'undefined' ? window.location : undefined;
    const hostname = location?.hostname;
    let knownHost;
    if (hostname && typeof hostname === 'string') {
      if (remoteHosts.some(host => hostname.endsWith(host))) {
        knownHost = hostname;
      } else {
        knownHost = knownHosts.find(host => hostname.endsWith(host));
      }
    }

    if (location && knownHost) {
      // If the user is on a boundary-node provided host, we can use the same host for the agent
      host = new URL(
        `${location.protocol}//${knownHost}${location.port ? ':' + location.port : ''}`,
      );
    } else {
      host = new URL('https://icp-api.io');
    }
  }
  return host.toString();
}

interface V1HttpAgentInterface {
  _identity: Promise<Identity> | null;
  readonly _fetch: typeof fetch;
  readonly _fetchOptions?: Record<string, unknown>;
  readonly _callOptions?: Record<string, unknown>;

  readonly _host: URL;
  readonly _credentials: string | undefined;
  readonly _retryTimes: number; // Retry requests N times before erroring by default
  _isAgent: true;
}

/** 
 * A HTTP agent allows users to interact with a client of the internet computer
using the available methods. It exposes an API that closely follows the
public view of the internet computer, and is not intended to be exposed
directly to the majority of users due to its low-level interface.
 * There is a pipeline to apply transformations to the request before sending
it to the client. This is to decouple signature, nonce generation and
other computations so that this class can stay as simple as possible while
allowing extensions.
 */
export class HttpAgent implements Agent {
  public rootKey: ArrayBuffer | null;
  #rootKeyPromise: Promise<ArrayBuffer> | null = null;
  #shouldFetchRootKey: boolean = false;
  #identity: Promise<Identity> | null;
  readonly #fetch: typeof fetch;
  readonly #fetchOptions?: Record<string, unknown>;
  readonly #callOptions?: Record<string, unknown>;
  #timeDiffMsecs = 0;
  readonly host: URL;
  readonly #credentials: string | undefined;
  readonly #retryTimes; // Retry requests N times before erroring by default
  #backoffStrategy: BackoffStrategyFactory;
  readonly #maxIngressExpiryInMinutes: number;

  // Public signature to help with type checking.
  public readonly _isAgent = true;
  public config: HttpAgentOptions = {};

  // The UTC time in milliseconds when the latest request was made
  #waterMark = 0;

  get waterMark(): number {
    return this.#waterMark;
  }

  public log: ObservableLog = new ObservableLog();

  #queryPipeline: HttpAgentRequestTransformFn[] = [];
  #updatePipeline: HttpAgentRequestTransformFn[] = [];

  #subnetKeys: ExpirableMap<string, SubnetStatus> = new ExpirableMap({
    expirationTime: 5 * 60 * 1000, // 5 minutes
  });
  #verifyQuerySignatures = true;

  /**
   * @param options - Options for the HttpAgent
   * @deprecated Use `HttpAgent.create` or `HttpAgent.createSync` instead
   */
  constructor(options: HttpAgentOptions = {}) {
    this.config = options;
    this.#fetch = options.fetch || getDefaultFetch() || fetch.bind(global);
    this.#fetchOptions = options.fetchOptions;
    this.#callOptions = options.callOptions;
    this.#shouldFetchRootKey = options.shouldFetchRootKey ?? false;

    // Use provided root key, otherwise fall back to IC_ROOT_KEY for mainnet or null if the key needs to be fetched
    if (options.rootKey) {
      this.rootKey = options.rootKey;
    } else if (this.#shouldFetchRootKey) {
      this.rootKey = null;
    } else {
      this.rootKey = fromHex(IC_ROOT_KEY);
    }

    const host = determineHost(options.host);
    this.host = new URL(host);

    if (options.verifyQuerySignatures !== undefined) {
      this.#verifyQuerySignatures = options.verifyQuerySignatures;
    }
    // Default is 3
    this.#retryTimes = options.retryTimes ?? 3;
    // Delay strategy for retries. Default is exponential backoff
    const defaultBackoffFactory = () =>
      new ExponentialBackoff({
        maxIterations: this.#retryTimes,
      });
    this.#backoffStrategy = options.backoffStrategy || defaultBackoffFactory;
    // Rewrite to avoid redirects
    if (this.host.hostname.endsWith(IC0_SUB_DOMAIN)) {
      this.host.hostname = IC0_DOMAIN;
    } else if (this.host.hostname.endsWith(ICP0_SUB_DOMAIN)) {
      this.host.hostname = ICP0_DOMAIN;
    } else if (this.host.hostname.endsWith(ICP_API_SUB_DOMAIN)) {
      this.host.hostname = ICP_API_DOMAIN;
    }

    if (options.credentials) {
      const { name, password } = options.credentials;
      this.#credentials = `${name}${password ? ':' + password : ''}`;
    }
    this.#identity = Promise.resolve(options.identity || new AnonymousIdentity());

    if (options.ingressExpiryInMinutes && options.ingressExpiryInMinutes > 5) {
      throw new AgentError(
        `The maximum ingress expiry time is 5 minutes. Provided ingress expiry time is ${options.ingressExpiryInMinutes} minutes.`,
      );
    }
    if (options.ingressExpiryInMinutes && options.ingressExpiryInMinutes <= 0) {
      throw new AgentError(
        `Ingress expiry time must be greater than 0. Provided ingress expiry time is ${options.ingressExpiryInMinutes} minutes.`,
      );
    }

    this.#maxIngressExpiryInMinutes = options.ingressExpiryInMinutes || 5;

    // Add a nonce transform to ensure calls are unique
    this.addTransform('update', makeNonceTransform(makeNonce));
    if (options.useQueryNonces) {
      this.addTransform('query', makeNonceTransform(makeNonce));
    }
    if (options.logToConsole) {
      this.log.subscribe(log => {
        if (log.level === 'error') {
          console.error(log.message);
        } else if (log.level === 'warn') {
          console.warn(log.message);
        } else {
          console.log(log.message);
        }
      });
    }
  }

  public static createSync(options: HttpAgentOptions = {}): HttpAgent {
    return new this({ ...options });
  }

  public static async create(
    options: HttpAgentOptions = {
      shouldFetchRootKey: false,
    },
  ): Promise<HttpAgent> {
    const agent = HttpAgent.createSync(options);
    const initPromises: Promise<ArrayBuffer | void>[] = [agent.syncTime()];
    if (agent.host.toString() !== 'https://icp-api.io' && options.shouldFetchRootKey) {
      initPromises.push(agent.fetchRootKey());
    }
    await Promise.all(initPromises);
    return agent;
  }

  public static async from(
    agent: Pick<HttpAgent, 'config'> | V1HttpAgentInterface,
  ): Promise<HttpAgent> {
    try {
      if ('config' in agent) {
        return await HttpAgent.create(agent.config);
      }
      return await HttpAgent.create({
        fetch: agent._fetch,
        fetchOptions: agent._fetchOptions,
        callOptions: agent._callOptions,
        host: agent._host.toString(),
        identity: agent._identity ?? undefined,
      });
    } catch {
      throw new AgentError('Failed to create agent from provided agent');
    }
  }

  public isLocal(): boolean {
    const hostname = this.host.hostname;
    return hostname === '127.0.0.1' || hostname.endsWith('127.0.0.1');
  }

  public addTransform(
    type: 'update' | 'query',
    fn: HttpAgentRequestTransformFn,
    priority = fn.priority || 0,
  ): void {
    if (type === 'update') {
      // Keep the pipeline sorted at all time, by priority.
      const i = this.#updatePipeline.findIndex(x => (x.priority || 0) < priority);
      this.#updatePipeline.splice(
        i >= 0 ? i : this.#updatePipeline.length,
        0,
        Object.assign(fn, { priority }),
      );
    } else if (type === 'query') {
      // Keep the pipeline sorted at all time, by priority.
      const i = this.#queryPipeline.findIndex(x => (x.priority || 0) < priority);
      this.#queryPipeline.splice(
        i >= 0 ? i : this.#queryPipeline.length,
        0,
        Object.assign(fn, { priority }),
      );
    }
  }

  public async getPrincipal(): Promise<Principal> {
    if (!this.#identity) {
      throw new IdentityInvalidError(
        "This identity has expired due this application's security policy. Please refresh your authentication.",
      );
    }
    return (await this.#identity).getPrincipal();
  }

  public async call(
    canisterId: Principal | string,
    options: {
      methodName: string;
      arg: ArrayBuffer;
      effectiveCanisterId?: Principal | string;
      callSync?: boolean;
    },
    identity?: Identity | Promise<Identity>,
  ): Promise<SubmitResponse> {
    await this.#rootKeyGuard();
    // TODO - restore this value
    const callSync = options.callSync ?? true;
    const id = await (identity !== undefined ? await identity : await this.#identity);
    if (!id) {
      throw new IdentityInvalidError(
        "This identity has expired due this application's security policy. Please refresh your authentication.",
      );
    }
    const canister = Principal.from(canisterId);
    const ecid = options.effectiveCanisterId
      ? Principal.from(options.effectiveCanisterId)
      : canister;

    const sender: Principal = id.getPrincipal() || Principal.anonymous();

    let ingress_expiry = new Expiry(this.#maxIngressExpiryInMinutes * MINUTE_TO_MSECS);

    // If the value is off by more than 30 seconds, reconcile system time with the network
    if (Math.abs(this.#timeDiffMsecs) > 1_000 * 30) {
      ingress_expiry = new Expiry(
        this.#maxIngressExpiryInMinutes * MINUTE_TO_MSECS + this.#timeDiffMsecs,
      );
    }

    const submit: CallRequest = {
      request_type: SubmitRequestType.Call,
      canister_id: canister,
      method_name: options.methodName,
      arg: options.arg,
      sender,
      ingress_expiry,
    };

    let transformedRequest = (await this._transform({
      request: {
        body: null,
        method: 'POST',
        headers: {
          'Content-Type': 'application/cbor',
          ...(this.#credentials ? { Authorization: 'Basic ' + btoa(this.#credentials) } : {}),
        },
      },
      endpoint: Endpoint.Call,
      body: submit,
    })) as HttpAgentSubmitRequest;

    const nonce: Nonce | undefined = transformedRequest.body.nonce
      ? toNonce(transformedRequest.body.nonce)
      : undefined;

    submit.nonce = nonce;

    function toNonce(buf: ArrayBuffer): Nonce {
      return new Uint8Array(buf) as Nonce;
    }

    // Apply transform for identity.
    transformedRequest = (await id.transformRequest(transformedRequest)) as HttpAgentSubmitRequest;

    const body = cbor.encode(transformedRequest.body);
    const backoff = this.#backoffStrategy();
    const requestId = requestIdOf(submit);
    try {
      // Attempt v3 sync call
      const requestSync = () => {
        this.log.print(
          `fetching "/api/v3/canister/${ecid.toText()}/call" with request:`,
          transformedRequest,
        );
        return this.#fetch('' + new URL(`/api/v3/canister/${ecid.toText()}/call`, this.host), {
          ...this.#callOptions,
          ...transformedRequest.request,
          body,
        });
      };

      const requestAsync = () => {
        this.log.print(
          `fetching "/api/v2/canister/${ecid.toText()}/call" with request:`,
          transformedRequest,
        );
        return this.#fetch('' + new URL(`/api/v2/canister/${ecid.toText()}/call`, this.host), {
          ...this.#callOptions,
          ...transformedRequest.request,
          body,
        });
      };

      const request = this.#requestAndRetry({
        request: callSync ? requestSync : requestAsync,
        backoff,
        tries: 0,
      });

      const response = await request;
      const responseBuffer = await response.arrayBuffer();
      const responseBody = (
        response.status === 200 && responseBuffer.byteLength > 0
          ? cbor.decode(responseBuffer)
          : null
      ) as SubmitResponse['response']['body'];

      // Update the watermark with the latest time from consensus
      if (responseBody && 'certificate' in (responseBody as v3ResponseBody)) {
        const time = await this.parseTimeFromResponse({
          certificate: (responseBody as v3ResponseBody).certificate,
        });
        this.#waterMark = time;
      }

      return {
        requestId,
        response: {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          body: responseBody,
          headers: httpHeadersTransform(response.headers),
        },
        requestDetails: submit,
      };
    } catch (error) {
      // If the error is due to the v3 api not being supported, fall back to v2
      if ((error as AgentError).message.includes('v3 api not supported.')) {
        this.log.warn('v3 api not supported. Fall back to v2');
        return this.call(
          canisterId,
          {
            ...options,
            // disable v3 api
            callSync: false,
          },
          identity,
        );
      }
      const callError = new AgentCallError(
        'Encountered an error while making call:',
        error as HttpDetailsResponse,
        toHex(requestId),
        toHex(transformedRequest.body.sender_pubkey),
        toHex(transformedRequest.body.sender_sig),
        String(transformedRequest.body.content.ingress_expiry['_value']),
      );
      this.log.error(
        `Error while making call: ${(error as Error).message ?? String(error)}`,
        callError,
      );
      throw callError;
    }
  }

  async #requestAndRetryQuery(args: {
    ecid: Principal;
    transformedRequest: HttpAgentRequest;
    body: ArrayBuffer;
    requestId: RequestId;
    backoff: BackoffStrategy;
    tries: number;
  }): Promise<ApiQueryResponse> {
    const { ecid, transformedRequest, body, requestId, backoff, tries } = args;

    const delay = tries === 0 ? 0 : backoff.next();
    this.log.print(`fetching "/api/v2/canister/${ecid.toString()}/query" with tries:`, {
      tries,
      backoff,
      delay,
    });

    // If delay is null, the backoff strategy is exhausted due to a maximum number of retries, duration, or other reason
    if (delay === null) {
      throw new AgentError(
        `Timestamp failed to pass the watermark after retrying the configured ${
          this.#retryTimes
        } times. We cannot guarantee the integrity of the response since it could be a replay attack.`,
      );
    }

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    let response: ApiQueryResponse;
    // Make the request and retry if it throws an error
    try {
      this.log.print(
        `fetching "/api/v2/canister/${ecid.toString()}/query" with request:`,
        transformedRequest,
      );
      const fetchResponse = await this.#fetch(
        '' + new URL(`/api/v2/canister/${ecid.toString()}/query`, this.host),
        {
          ...this.#fetchOptions,
          ...transformedRequest.request,
          body,
        },
      );
      if (fetchResponse.status === 200) {
        const queryResponse: QueryResponse = cbor.decode(await fetchResponse.arrayBuffer());
        response = {
          ...queryResponse,
          httpDetails: {
            ok: fetchResponse.ok,
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            headers: httpHeadersTransform(fetchResponse.headers),
          },
          requestId,
        };
      } else {
        throw new AgentHTTPResponseError(
          `Gateway returned an error:\n` +
            `  Code: ${fetchResponse.status} (${fetchResponse.statusText})\n` +
            `  Body: ${await fetchResponse.text()}\n`,
          {
            ok: fetchResponse.ok,
            status: fetchResponse.status,
            statusText: fetchResponse.statusText,
            headers: httpHeadersTransform(fetchResponse.headers),
          },
        );
      }
    } catch (error) {
      if (tries < this.#retryTimes) {
        this.log.warn(
          `Caught exception while attempting to make query:\n` +
            `  ${error}\n` +
            `  Retrying query.`,
        );
        return await this.#requestAndRetryQuery({ ...args, tries: tries + 1 });
      }
      throw error;
    }

    const timestamp = response.signatures?.[0]?.timestamp;

    // Skip watermark verification if the user has set verifyQuerySignatures to false
    if (!this.#verifyQuerySignatures) {
      return response;
    }

    if (!timestamp) {
      throw new Error(
        'Timestamp not found in query response. This suggests a malformed or malicious response.',
      );
    }

    // Convert the timestamp to milliseconds
    const timeStampInMs = Number(BigInt(timestamp) / BigInt(1_000_000));

    this.log.print('watermark and timestamp', {
      waterMark: this.waterMark,
      timestamp: timeStampInMs,
    });

    // If the timestamp is less than the watermark, retry the request up to the retry limit
    if (Number(this.waterMark) > timeStampInMs) {
      const error = new AgentError('Timestamp is below the watermark. Retrying query.');
      this.log.error('Timestamp is below', error, {
        timestamp,
        waterMark: this.waterMark,
      });
      if (tries < this.#retryTimes) {
        return await this.#requestAndRetryQuery({ ...args, tries: tries + 1 });
      }
      {
        throw new AgentError(
          `Timestamp failed to pass the watermark after retrying the configured ${
            this.#retryTimes
          } times. We cannot guarantee the integrity of the response since it could be a replay attack.`,
        );
      }
    }

    return response;
  }

  async #requestAndRetry(args: {
    request: () => Promise<Response>;
    backoff: BackoffStrategy;
    tries: number;
  }): Promise<Response> {
    const { request, backoff, tries } = args;
    const delay = tries === 0 ? 0 : backoff.next();

    // If delay is null, the backoff strategy is exhausted due to a maximum number of retries, duration, or other reason
    if (delay === null) {
      throw new AgentError(
        `Timestamp failed to pass the watermark after retrying the configured ${
          this.#retryTimes
        } times. We cannot guarantee the integrity of the response since it could be a replay attack.`,
      );
    }

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    let response: Response;
    try {
      response = await request();
    } catch (error) {
      if (this.#retryTimes > tries) {
        this.log.warn(
          `Caught exception while attempting to make request:\n` +
            `  ${error}\n` +
            `  Retrying request.`,
        );
        // Delay the request by the configured backoff strategy
        return await this.#requestAndRetry({ request, backoff, tries: tries + 1 });
      }
      throw error;
    }
    if (response.ok) {
      return response;
    }

    const responseText = await response.clone().text();
    const errorMessage =
      `Server returned an error:\n` +
      `  Code: ${response.status} (${response.statusText})\n` +
      `  Body: ${responseText}\n`;

    if (response.status === 404 && response.url.includes('api/v3')) {
      throw new AgentHTTPResponseError('v3 api not supported. Fall back to v2', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: httpHeadersTransform(response.headers),
      });
    }
    if (tries < this.#retryTimes) {
      return await this.#requestAndRetry({ request, backoff, tries: tries + 1 });
    }

    throw new AgentHTTPResponseError(errorMessage, {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: httpHeadersTransform(response.headers),
    });
  }

  public async query(
    canisterId: Principal | string,
    fields: QueryFields,
    identity?: Identity | Promise<Identity>,
  ): Promise<ApiQueryResponse> {
    await this.#rootKeyGuard();
    const backoff = this.#backoffStrategy();
    const ecid = fields.effectiveCanisterId
      ? Principal.from(fields.effectiveCanisterId)
      : Principal.from(canisterId);

    this.log.print(`ecid ${ecid.toString()}`);
    this.log.print(`canisterId ${canisterId.toString()}`);

    let transformedRequest: HttpAgentRequest | undefined = undefined;
    let queryResult;
    const id = await (identity !== undefined ? identity : this.#identity);
    if (!id) {
      throw new IdentityInvalidError(
        "This identity has expired due this application's security policy. Please refresh your authentication.",
      );
    }

    const canister = Principal.from(canisterId);
    const sender = id?.getPrincipal() || Principal.anonymous();

    const request: QueryRequest = {
      request_type: ReadRequestType.Query,
      canister_id: canister,
      method_name: fields.methodName,
      arg: fields.arg,
      sender,
      ingress_expiry: new Expiry(this.#maxIngressExpiryInMinutes * MINUTE_TO_MSECS),
    };

    const requestId = requestIdOf(request);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transformedRequest = await this._transform({
      request: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/cbor',
          ...(this.#credentials ? { Authorization: 'Basic ' + btoa(this.#credentials) } : {}),
        },
      },
      endpoint: Endpoint.Query,
      body: request,
    });

    // Apply transform for identity.
    transformedRequest = (await id?.transformRequest(transformedRequest)) as HttpAgentRequest;

    const body = cbor.encode(transformedRequest.body);

    const args = {
      canister: canister.toText(),
      ecid,
      transformedRequest,
      body,
      requestId,
      backoff,
      tries: 0,
    };
    const makeQuery = async () => {
      return {
        requestDetails: request,
        query: await this.#requestAndRetryQuery(args),
      };
    };

    const getSubnetStatus = async (): Promise<SubnetStatus | void> => {
      if (!this.#verifyQuerySignatures) {
        return undefined;
      }
      const subnetStatus = this.#subnetKeys.get(ecid.toString());
      if (subnetStatus) {
        return subnetStatus;
      }
      await this.fetchSubnetKeys(ecid.toString());
      return this.#subnetKeys.get(ecid.toString());
    };
    // Attempt to make the query i=retryTimes times
    // Make query and fetch subnet keys in parallel

    try {
      const [_queryResult, subnetStatus] = await Promise.all([makeQuery(), getSubnetStatus()]);
      queryResult = _queryResult;
      const { requestDetails, query } = queryResult;

      const queryWithDetails = {
        ...query,
        requestDetails,
      };

      this.log.print('Query response:', queryWithDetails);
      // Skip verification if the user has disabled it
      if (!this.#verifyQuerySignatures) {
        return queryWithDetails;
      }

      try {
        return this.#verifyQueryResponse(queryWithDetails, subnetStatus);
      } catch {
        // In case the node signatures have changed, refresh the subnet keys and try again
        this.log.warn('Query response verification failed. Retrying with fresh subnet keys.');
        this.#subnetKeys.delete(canisterId.toString());
        await this.fetchSubnetKeys(ecid.toString());

        const updatedSubnetStatus = this.#subnetKeys.get(canisterId.toString());
        if (!updatedSubnetStatus) {
          throw new CertificateVerificationError(
            'Invalid signature from replica signed query: no matching node key found.',
          );
        }
        return this.#verifyQueryResponse(queryWithDetails, updatedSubnetStatus);
      }
    } catch (error) {
      throw new AgentQueryError(
        'Encountered an error while making a query:',
        error as HttpDetailsResponse,
        String(requestId),
        toHex(transformedRequest?.body?.sender_pubkey),
        toHex(transformedRequest?.body?.sender_sig),
        String(transformedRequest?.body?.content.ingress_expiry['_value']),
      );
    }
  }

  /**
   * See https://internetcomputer.org/docs/current/references/ic-interface-spec/#http-query for details on validation
   * @param queryResponse - The response from the query
   * @param subnetStatus - The subnet status, including all node keys
   * @returns ApiQueryResponse
   */
  #verifyQueryResponse = (
    queryResponse: ApiQueryResponse,
    subnetStatus: SubnetStatus | void,
  ): ApiQueryResponse => {
    if (this.#verifyQuerySignatures === false) {
      // This should not be called if the user has disabled verification
      return queryResponse;
    }
    if (!subnetStatus) {
      throw new CertificateVerificationError(
        'Invalid signature from replica signed query: no matching node key found.',
      );
    }
    const { status, signatures = [], requestId } = queryResponse;

    const domainSeparator = new TextEncoder().encode('\x0Bic-response');
    for (const sig of signatures) {
      const { timestamp, identity } = sig;
      const nodeId = Principal.fromUint8Array(identity).toText();
      let hash: ArrayBuffer;

      // Hash is constructed differently depending on the status
      if (status === 'replied') {
        const { reply } = queryResponse;
        hash = hashOfMap({
          status: status,
          reply: reply,
          timestamp: BigInt(timestamp),
          request_id: requestId,
        });
      } else if (status === 'rejected') {
        const { reject_code, reject_message, error_code } = queryResponse;
        hash = hashOfMap({
          status: status,
          reject_code: reject_code,
          reject_message: reject_message,
          error_code: error_code,
          timestamp: BigInt(timestamp),
          request_id: requestId,
        });
      } else {
        throw new Error(`Unknown status: ${status}`);
      }

      const separatorWithHash = concat(domainSeparator, new Uint8Array(hash));

      // FIX: check for match without verifying N times
      const pubKey = subnetStatus?.nodeKeys.get(nodeId);
      if (!pubKey) {
        throw new CertificateVerificationError(
          'Invalid signature from replica signed query: no matching node key found.',
        );
      }
      const rawKey = Ed25519PublicKey.fromDer(pubKey).rawKey;
      const valid = ed25519.verify(
        sig.signature,
        new Uint8Array(separatorWithHash),
        new Uint8Array(rawKey),
      );
      if (valid) return queryResponse;

      throw new CertificateVerificationError(
        `Invalid signature from replica ${nodeId} signed query.`,
      );
    }
    return queryResponse;
  };

  public async createReadStateRequest(
    fields: ReadStateOptions,
    identity?: Identity | Promise<Identity>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    await this.#rootKeyGuard();
    const id = await (identity !== undefined ? await identity : await this.#identity);
    if (!id) {
      throw new IdentityInvalidError(
        "This identity has expired due this application's security policy. Please refresh your authentication.",
      );
    }
    const sender = id?.getPrincipal() || Principal.anonymous();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedRequest = await this._transform({
      request: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/cbor',
          ...(this.#credentials ? { Authorization: 'Basic ' + btoa(this.#credentials) } : {}),
        },
      },
      endpoint: Endpoint.ReadState,
      body: {
        request_type: ReadRequestType.ReadState,
        paths: fields.paths,
        sender,
        ingress_expiry: new Expiry(this.#maxIngressExpiryInMinutes * MINUTE_TO_MSECS),
      },
    });

    // Apply transform for identity.
    return id?.transformRequest(transformedRequest);
  }

  public async readState(
    canisterId: Principal | string,
    fields: ReadStateOptions,
    identity?: Identity | Promise<Identity>,
    // eslint-disable-next-line
    request?: any,
  ): Promise<ReadStateResponse> {
    await this.#rootKeyGuard();
    const canister = typeof canisterId === 'string' ? Principal.fromText(canisterId) : canisterId;

    const transformedRequest = request ?? (await this.createReadStateRequest(fields, identity));

    // With read_state, we should always use a fresh expiry, even beyond the point where the initial request would have expired
    const bodyWithAdjustedExpiry = {
      ...transformedRequest.body,
      ingress_expiry: new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS),
    };

    const body = cbor.encode(bodyWithAdjustedExpiry);

    this.log.print(
      `fetching "/api/v2/canister/${canister}/read_state" with request:`,
      transformedRequest,
    );
    // TODO - https://dfinity.atlassian.net/browse/SDK-1092
    const backoff = this.#backoffStrategy();
    try {
      const response = await this.#requestAndRetry({
        request: () =>
          this.#fetch(
            '' + new URL(`/api/v2/canister/${canister.toString()}/read_state`, this.host),
            {
              ...this.#fetchOptions,
              ...transformedRequest.request,
              body,
            },
          ),
        backoff,
        tries: 0,
      });

      if (!response.ok) {
        throw new Error(
          `Server returned an error:\n` +
            `  Code: ${response.status} (${response.statusText})\n` +
            `  Body: ${await response.text()}\n`,
        );
      }
      const decodedResponse: ReadStateResponse = cbor.decode(await response.arrayBuffer());

      this.log.print('Read state response:', decodedResponse);
      const parsedTime = await this.parseTimeFromResponse(decodedResponse);
      if (parsedTime > 0) {
        this.log.print('Read state response time:', parsedTime);
        this.#waterMark = parsedTime;
      }

      return decodedResponse;
    } catch (error) {
      this.log.error('Caught exception while attempting to read state', error as AgentError);
      throw error;
    }
  }

  public async parseTimeFromResponse(response: { certificate: ArrayBuffer }): Promise<number> {
    let tree: HashTree;
    if (response.certificate) {
      const decoded: { tree: HashTree } | undefined = cbor.decode(response.certificate);
      if (decoded && 'tree' in decoded) {
        tree = decoded.tree;
      } else {
        throw new Error('Could not decode time from response');
      }
      const timeLookup = lookup_path(['time'], tree);
      if (timeLookup.status !== LookupStatus.Found) {
        throw new Error('Time was not found in the response or was not in its expected format.');
      }

      if (!(timeLookup.value instanceof ArrayBuffer) && !ArrayBuffer.isView(timeLookup)) {
        throw new Error('Time was not found in the response or was not in its expected format.');
      }
      const date = decodeTime(bufFromBufLike(timeLookup.value as ArrayBuffer));
      this.log.print('Time from response:', date);
      this.log.print('Time from response in milliseconds:', Number(date));
      return Number(date);
    } else {
      this.log.warn('No certificate found in response');
    }
    return 0;
  }

  /**
   * Allows agent to sync its time with the network. Can be called during intialization or mid-lifecycle if the device's clock has drifted away from the network time. This is necessary to set the Expiry for a request
   * @param {Principal} canisterId - Pass a canister ID if you need to sync the time with a particular replica. Uses the management canister by default
   */
  public async syncTime(canisterId?: Principal): Promise<void> {
    await this.#rootKeyGuard();
    const CanisterStatus = await import('../../canisterStatus');
    const callTime = Date.now();
    try {
      if (!canisterId) {
        this.log.print(
          'Syncing time with the IC. No canisterId provided, so falling back to ryjl3-tyaaa-aaaaa-aaaba-cai',
        );
      }
      const status = await CanisterStatus.request({
        // Fall back with canisterId of the ICP Ledger
        canisterId: canisterId ?? Principal.from('ryjl3-tyaaa-aaaaa-aaaba-cai'),
        agent: this,
        paths: ['time'],
      });

      const replicaTime = status.get('time');
      if (replicaTime) {
        this.#timeDiffMsecs = Number(replicaTime as bigint) - Number(callTime);
      }
    } catch (error) {
      this.log.error('Caught exception while attempting to sync time', error as AgentError);
    }
  }

  public async status(): Promise<JsonObject> {
    const headers: Record<string, string> = this.#credentials
      ? {
          Authorization: 'Basic ' + btoa(this.#credentials),
        }
      : {};

    this.log.print(`fetching "/api/v2/status"`);
    const backoff = this.#backoffStrategy();
    const response = await this.#requestAndRetry({
      backoff,
      request: () =>
        this.#fetch('' + new URL(`/api/v2/status`, this.host), { headers, ...this.#fetchOptions }),
      tries: 0,
    });
    return cbor.decode(await response.arrayBuffer());
  }

  public async fetchRootKey(): Promise<ArrayBuffer> {
    let result: ArrayBuffer;
    // Wait for already pending promise to avoid duplicate calls
    if (this.#rootKeyPromise) {
      result = await this.#rootKeyPromise;
    } else {
      // construct promise
      this.#rootKeyPromise = new Promise<ArrayBuffer>((resolve, reject) => {
        this.status()
          .then(value => {
            // Hex-encoded version of the replica root key
            const rootKey = (value as JsonObject & { root_key: ArrayBuffer }).root_key;
            this.rootKey = rootKey;
            resolve(rootKey);
          })
          .catch(reject);
      });
      result = await this.#rootKeyPromise;
    }
    // clear rootkey promise and return result
    this.#rootKeyPromise = null;
    return result;
  }

  async #rootKeyGuard(): Promise<void> {
    if (this.rootKey) {
      return;
    } else if (this.rootKey === null && this.#shouldFetchRootKey) {
      await this.fetchRootKey();
    } else {
      throw new AgentError(
        `Invalid root key detected. The root key for this agent is ${this.rootKey} and the shouldFetchRootKey value is set to ${this.#shouldFetchRootKey}. The root key should only be unknown if you are in local development. Otherwise you should avoid fetching and use the default IC Root Key or the known root key of your environment.`,
      );
    }
  }

  public invalidateIdentity(): void {
    this.#identity = null;
  }

  public replaceIdentity(identity: Identity): void {
    this.#identity = Promise.resolve(identity);
  }

  public async fetchSubnetKeys(canisterId: Principal | string) {
    await this.#rootKeyGuard();
    const effectiveCanisterId: Principal = Principal.from(canisterId);
    const response = await request({
      canisterId: effectiveCanisterId,
      paths: ['subnet'],
      agent: this,
    });

    const subnetResponse = response.get('subnet');
    if (subnetResponse && typeof subnetResponse === 'object' && 'nodeKeys' in subnetResponse) {
      this.#subnetKeys.set(effectiveCanisterId.toText(), subnetResponse as SubnetStatus);
      return subnetResponse as SubnetStatus;
    }
    // If the subnet status is not returned, return undefined
    return undefined;
  }

  protected _transform(request: HttpAgentRequest): Promise<HttpAgentRequest> {
    let p = Promise.resolve(request);
    if (request.endpoint === Endpoint.Call) {
      for (const fn of this.#updatePipeline) {
        p = p.then(r => fn(r).then(r2 => r2 || r));
      }
    } else {
      for (const fn of this.#queryPipeline) {
        p = p.then(r => fn(r).then(r2 => r2 || r));
      }
    }

    return p;
  }
}
