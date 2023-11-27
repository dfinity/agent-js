import { JsonObject } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { AgentError } from '../../errors';
import { AnonymousIdentity, Identity } from '../../auth';
import * as cbor from '../../cbor';
import { hashOfMap, requestIdOf } from '../../request_id';
import { concat, fromHex } from '../../utils/buffer';
import {
  Agent,
  ApiQueryResponse,
  QueryFields,
  QueryResponse,
  ReadStateOptions,
  ReadStateResponse,
  SubmitResponse,
} from '../api';
import { Expiry, httpHeadersTransform, makeNonceTransform } from './transforms';
import {
  CallRequest,
  Endpoint,
  HttpAgentRequest,
  HttpAgentRequestTransformFn,
  HttpAgentSubmitRequest,
  makeNonce,
  QueryRequest,
  ReadRequestType,
  SubmitRequestType,
} from './types';
import { AgentHTTPResponseError } from './errors';
import { SubnetStatus, request } from '../../canisterStatus';
import { CertificateVerificationError } from '../../certificate';
import { ed25519 } from '@noble/curves/ed25519';
import { ExpirableMap } from '../../utils/expirableMap';
import { Ed25519PublicKey } from '../../public_key';

export * from './transforms';
export { Nonce, makeNonce } from './types';

export enum RequestStatusResponseStatus {
  Received = 'received',
  Processing = 'processing',
  Replied = 'replied',
  Rejected = 'rejected',
  Unknown = 'unknown',
  Done = 'done',
}

// Default delta for ingress expiry is 5 minutes.
const DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS = 5 * 60 * 1000;

// Root public key for the IC, encoded as hex
const IC_ROOT_KEY =
  '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100814' +
  'c0e6ec71fab583b08bd81373c255c3c371b2e84863c98a4f1e08b74235d14fb5d9c0cd546d968' +
  '5f913a0c0b2cc5341583bf4b4392e467db96d65b9bb4cb717112f8472e0d5a4d14505ffd7484' +
  'b01291091c5f87b98883463f98091a0baaae';

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
  // Another HttpAgent to inherit configuration (pipeline and fetch) of. This
  // is only used at construction.
  source?: HttpAgent;

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

  credentials?: {
    name: string;
    password?: string;
  };
  /**
   * Adds a unique {@link Nonce} with each query.
   * Enabling will prevent queries from being answered with a cached response.
   *
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
   * Whether the agent should verify signatures signed by node keys on query responses. Increases security, but adds overhead and must make a separate request to cache the node keys for the canister's subnet.
   * @default true
   */
  verifyQuerySignatures?: boolean;
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

// A HTTP agent allows users to interact with a client of the internet computer
// using the available methods. It exposes an API that closely follows the
// public view of the internet computer, and is not intended to be exposed
// directly to the majority of users due to its low-level interface.
//
// There is a pipeline to apply transformations to the request before sending
// it to the client. This is to decouple signature, nonce generation and
// other computations so that this class can stay as simple as possible while
// allowing extensions.
export class HttpAgent implements Agent {
  public rootKey = fromHex(IC_ROOT_KEY);
  private _identity: Promise<Identity> | null;
  private readonly _fetch: typeof fetch;
  private readonly _fetchOptions?: Record<string, unknown>;
  private readonly _callOptions?: Record<string, unknown>;
  private _timeDiffMsecs = 0;
  private readonly _host: URL;
  private readonly _credentials: string | undefined;
  private _rootKeyFetched = false;
  private readonly _retryTimes; // Retry requests N times before erroring by default
  public readonly _isAgent = true;

  #queryPipeline: HttpAgentRequestTransformFn[] = [];
  #updatePipeline: HttpAgentRequestTransformFn[] = [];

  #subnetKeys: ExpirableMap<string, SubnetStatus> = new ExpirableMap({
    expirationTime: 5 * 60 * 1000, // 5 minutes
  });
  #verifyQuerySignatures = true;

  constructor(options: HttpAgentOptions = {}) {
    if (options.source) {
      if (!(options.source instanceof HttpAgent)) {
        throw new Error("An Agent's source can only be another HttpAgent");
      }
      this._identity = options.source._identity;
      this._fetch = options.source._fetch;
      this._host = options.source._host;
      this._credentials = options.source._credentials;
    } else {
      this._fetch = options.fetch || getDefaultFetch() || fetch.bind(global);
      this._fetchOptions = options.fetchOptions;
      this._callOptions = options.callOptions;
    }
    if (options.host !== undefined) {
      if (!options.host.match(/^[a-z]+:/) && typeof window !== 'undefined') {
        this._host = new URL(window.location.protocol + '//' + options.host);
      } else {
        this._host = new URL(options.host);
      }
    } else if (options.source !== undefined) {
      // Safe to ignore here.
      this._host = options.source._host;
    } else {
      const location = typeof window !== 'undefined' ? window.location : undefined;
      if (!location) {
        this._host = new URL('https://icp-api.io');
        console.warn(
          'Could not infer host from window.location, defaulting to mainnet gateway of https://icp-api.io. Please provide a host to the HttpAgent constructor to avoid this warning.',
        );
      }
      // Mainnet and local will have the api route available
      const knownHosts = ['ic0.app', 'icp0.io', '127.0.0.1', 'localhost'];
      const hostname = location?.hostname;
      let knownHost;
      if (hostname && typeof hostname === 'string') {
        knownHost = knownHosts.find(host => hostname.endsWith(host));
      }

      if (location && knownHost) {
        // If the user is on a boundary-node provided host, we can use the same host for the agent
        this._host = new URL(
          `${location.protocol}//${knownHost}${location.port ? ':' + location.port : ''}`,
        );
      } else {
        this._host = new URL('https://icp-api.io');
        console.warn(
          'Could not infer host from window.location, defaulting to mainnet gateway of https://icp-api.io. Please provide a host to the HttpAgent constructor to avoid this warning.',
        );
      }
    }
    if (options.verifyQuerySignatures !== undefined) {
      this.#verifyQuerySignatures = options.verifyQuerySignatures;
    }
    // Default is 3, only set from option if greater or equal to 0
    this._retryTimes =
      options.retryTimes !== undefined && options.retryTimes >= 0 ? options.retryTimes : 3;
    // Rewrite to avoid redirects
    if (this._host.hostname.endsWith(IC0_SUB_DOMAIN)) {
      this._host.hostname = IC0_DOMAIN;
    } else if (this._host.hostname.endsWith(ICP0_SUB_DOMAIN)) {
      this._host.hostname = ICP0_DOMAIN;
    } else if (this._host.hostname.endsWith(ICP_API_SUB_DOMAIN)) {
      this._host.hostname = ICP_API_DOMAIN;
    }

    if (options.credentials) {
      const { name, password } = options.credentials;
      this._credentials = `${name}${password ? ':' + password : ''}`;
    }
    this._identity = Promise.resolve(options.identity || new AnonymousIdentity());

    // Add a nonce transform to ensure calls are unique
    this.addTransform('update', makeNonceTransform(makeNonce));
    if (options.useQueryNonces) {
      this.addTransform('query', makeNonceTransform(makeNonce));
    }
  }

  public isLocal(): boolean {
    const hostname = this._host.hostname;
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
    if (!this._identity) {
      throw new IdentityInvalidError(
        "This identity has expired due this application's security policy. Please refresh your authentication.",
      );
    }
    return (await this._identity).getPrincipal();
  }

  public async call(
    canisterId: Principal | string,
    options: {
      methodName: string;
      arg: ArrayBuffer;
      effectiveCanisterId?: Principal | string;
    },
    identity?: Identity | Promise<Identity>,
  ): Promise<SubmitResponse> {
    const id = await (identity !== undefined ? await identity : await this._identity);
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

    let ingress_expiry = new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS);

    // If the value is off by more than 30 seconds, reconcile system time with the network
    if (Math.abs(this._timeDiffMsecs) > 1_000 * 30) {
      ingress_expiry = new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS + this._timeDiffMsecs);
    }

    const submit: CallRequest = {
      request_type: SubmitRequestType.Call,
      canister_id: canister,
      method_name: options.methodName,
      arg: options.arg,
      sender,
      ingress_expiry,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let transformedRequest: any = (await this._transform({
      request: {
        body: null,
        method: 'POST',
        headers: {
          'Content-Type': 'application/cbor',
          ...(this._credentials ? { Authorization: 'Basic ' + btoa(this._credentials) } : {}),
        },
      },
      endpoint: Endpoint.Call,
      body: submit,
    })) as HttpAgentSubmitRequest;

    // Apply transform for identity.
    transformedRequest = await id.transformRequest(transformedRequest);

    const body = cbor.encode(transformedRequest.body);

    // Run both in parallel. The fetch is quite expensive, so we have plenty of time to
    // calculate the requestId locally.
    const request = this._requestAndRetry(() =>
      this._fetch('' + new URL(`/api/v2/canister/${ecid.toText()}/call`, this._host), {
        ...this._callOptions,
        ...transformedRequest.request,
        body,
      }),
    );

    const [response, requestId] = await Promise.all([request, requestIdOf(submit)]);

    const responseBuffer = await response.arrayBuffer();
    const responseBody = (
      response.status === 200 && responseBuffer.byteLength > 0 ? cbor.decode(responseBuffer) : null
    ) as SubmitResponse['response']['body'];

    return {
      requestId,
      response: {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
        headers: httpHeadersTransform(response.headers),
      },
    };
  }

  private async _requestAndRetry(request: () => Promise<Response>, tries = 0): Promise<Response> {
    let response: Response;
    try {
      response = await request();
    } catch (error) {
      if (this._retryTimes > tries) {
        console.warn(
          `Caught exception while attempting to make request:\n` +
            `  ${error}\n` +
            `  Retrying request.`,
        );
        return await this._requestAndRetry(request, tries + 1);
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

    if (this._retryTimes > tries) {
      console.warn(errorMessage + `  Retrying request.`);
      return await this._requestAndRetry(request, tries + 1);
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
    const makeQuery = async () => {
      const id = await (identity !== undefined ? await identity : await this._identity);
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
        ingress_expiry: new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS),
      };

      const requestId = await requestIdOf(request);

      // TODO: remove this any. This can be a Signed or UnSigned request.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let transformedRequest: any = await this._transform({
        request: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/cbor',
            ...(this._credentials ? { Authorization: 'Basic ' + btoa(this._credentials) } : {}),
          },
        },
        endpoint: Endpoint.Query,
        body: request,
      });

      // Apply transform for identity.
      transformedRequest = await id?.transformRequest(transformedRequest);

      const body = cbor.encode(transformedRequest.body);

      const response = await this._requestAndRetry(() =>
        this._fetch('' + new URL(`/api/v2/canister/${canister.toText()}/query`, this._host), {
          ...this._fetchOptions,
          ...transformedRequest.request,
          body,
        }),
      );

      const queryResponse: QueryResponse = cbor.decode(await response.arrayBuffer());

      return {
        ...queryResponse,
        httpDetails: {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: httpHeadersTransform(response.headers),
        },
        requestId,
      };
    };

    const getSubnetStatus = async (): Promise<SubnetStatus | void> => {
      if (!this.#verifyQuerySignatures) {
        return undefined;
      }
      const subnetStatus = this.#subnetKeys.get(canisterId.toString());
      if (subnetStatus) {
        return subnetStatus;
      }
      await this.fetchSubnetKeys(canisterId.toString());
      return this.#subnetKeys.get(canisterId.toString());
    };
    // Make query and fetch subnet keys in parallel
    const [query, subnetStatus] = await Promise.all([makeQuery(), getSubnetStatus()]);
    // Skip verification if the user has disabled it
    if (!this.#verifyQuerySignatures) {
      return query;
    }
    try {
      return this.#verifyQueryResponse(query, subnetStatus);
    } catch (_) {
      // In case the node signatures have changed, refresh the subnet keys and try again
      console.warn('Query response verification failed. Retrying with fresh subnet keys.');
      this.#subnetKeys.delete(canisterId.toString());
      await this.fetchSubnetKeys(canisterId.toString());

      const updatedSubnetStatus = this.#subnetKeys.get(canisterId.toString());
      if (!updatedSubnetStatus) {
        throw new CertificateVerificationError(
          'Invalid signature from replica signed query: no matching node key found.',
        );
      }
      return this.#verifyQueryResponse(query, updatedSubnetStatus);
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
    const id = await (identity !== undefined ? await identity : await this._identity);
    if (!id) {
      throw new IdentityInvalidError(
        "This identity has expired due this application's security policy. Please refresh your authentication.",
      );
    }
    const sender = id?.getPrincipal() || Principal.anonymous();

    // TODO: remove this any. This can be a Signed or UnSigned request.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedRequest: any = await this._transform({
      request: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/cbor',
          ...(this._credentials ? { Authorization: 'Basic ' + btoa(this._credentials) } : {}),
        },
      },
      endpoint: Endpoint.ReadState,
      body: {
        request_type: ReadRequestType.ReadState,
        paths: fields.paths,
        sender,
        ingress_expiry: new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS),
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
    const canister = typeof canisterId === 'string' ? Principal.fromText(canisterId) : canisterId;

    const transformedRequest = request ?? (await this.createReadStateRequest(fields, identity));
    const body = cbor.encode(transformedRequest.body);

    // TODO - https://dfinity.atlassian.net/browse/SDK-1092
    const response = await this._requestAndRetry(() =>
      this._fetch('' + new URL(`/api/v2/canister/${canister}/read_state`, this._host), {
        ...this._fetchOptions,
        ...transformedRequest.request,
        body,
      }),
    );

    if (!response.ok) {
      throw new Error(
        `Server returned an error:\n` +
          `  Code: ${response.status} (${response.statusText})\n` +
          `  Body: ${await response.text()}\n`,
      );
    }
    return cbor.decode(await response.arrayBuffer());
  }

  /**
   * Allows agent to sync its time with the network. Can be called during intialization or mid-lifecycle if the device's clock has drifted away from the network time. This is necessary to set the Expiry for a request
   * @param {Principal} canisterId - Pass a canister ID if you need to sync the time with a particular replica. Uses the management canister by default
   */
  public async syncTime(canisterId?: Principal): Promise<void> {
    const CanisterStatus = await import('../../canisterStatus');
    const callTime = Date.now();
    try {
      if (!canisterId) {
        console.log(
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
        this._timeDiffMsecs = Number(replicaTime as any) - Number(callTime);
      }
    } catch (error) {
      console.error('Caught exception while attempting to sync time:', error);
    }
  }

  public async status(): Promise<JsonObject> {
    const headers: Record<string, string> = this._credentials
      ? {
          Authorization: 'Basic ' + btoa(this._credentials),
        }
      : {};

    const response = await this._requestAndRetry(() =>
      this._fetch('' + new URL(`/api/v2/status`, this._host), { headers, ...this._fetchOptions }),
    );

    return cbor.decode(await response.arrayBuffer());
  }

  public async fetchRootKey(): Promise<ArrayBuffer> {
    if (!this._rootKeyFetched) {
      // Hex-encoded version of the replica root key
      this.rootKey = ((await this.status()) as any).root_key;
      this._rootKeyFetched = true;
    }
    return this.rootKey;
  }

  public invalidateIdentity(): void {
    this._identity = null;
  }

  public replaceIdentity(identity: Identity): void {
    this._identity = Promise.resolve(identity);
  }

  public async fetchSubnetKeys(canisterId: Principal | string) {
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
