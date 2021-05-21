import { Buffer } from 'buffer/';
import { AnonymousIdentity, Identity } from '../../auth';
import * as cbor from '../../cbor';
import { Principal } from '@dfinity/principal';
import { requestIdOf } from '../../request_id';
import {
  BinaryBlob,
  blobFromHex,
  blobFromUint8Array,
  JsonObject,
} from '../../../../candid/src/types';
import {
  Agent,
  QueryFields,
  QueryResponse,
  ReadStateOptions,
  ReadStateResponse,
  SubmitResponse,
} from '../api';
import { Expiry } from './transforms';
import {
  CallRequest,
  Endpoint,
  HttpAgentRequest,
  HttpAgentRequestTransformFn,
  HttpAgentSubmitRequest,
  QueryRequest,
  ReadRequestType,
  SubmitRequestType,
} from './types';

export * from './transforms';

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

// HttpAgent options that can be used at construction.
export interface HttpAgentOptions {
  // Another HttpAgent to inherit configuration (pipeline and fetch) of. This
  // is only used at construction.
  source?: HttpAgent;

  // A surrogate to the global fetch function. Useful for testing.
  fetch?: typeof fetch;

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
}

declare const window: Window & { fetch: typeof fetch };
declare const global: { fetch: typeof fetch };
declare const self: { fetch: typeof fetch };

function getDefaultFetch(): typeof fetch {
  const result =
    typeof window === 'undefined'
      ? typeof global === 'undefined'
        ? typeof self === 'undefined'
          ? undefined
          : self.fetch.bind(self)
        : global.fetch.bind(global)
      : window.fetch.bind(window);

  if (!result) {
    throw new Error('Could not find default `fetch` implementation.');
  }

  return result;
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
  private readonly _pipeline: HttpAgentRequestTransformFn[] = [];
  private readonly _identity: Promise<Identity>;
  private readonly _fetch: typeof fetch;
  private readonly _host: URL;
  private readonly _credentials: string | undefined;
  private _rootKeyFetched = false;
  public rootKey = blobFromHex(IC_ROOT_KEY);

  constructor(options: HttpAgentOptions = {}) {
    if (options.source) {
      if (!(options.source instanceof HttpAgent)) {
        throw new Error("An Agent's source can only be another HttpAgent");
      }
      this._pipeline = [...options.source._pipeline];
      this._identity = options.source._identity;
      this._fetch = options.source._fetch;
      this._host = options.source._host;
      this._credentials = options.source._credentials;
    } else {
      this._fetch = options.fetch || getDefaultFetch() || fetch.bind(global);
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
        throw new Error('Must specify a host to connect to.');
      }
      this._host = new URL(location + '');
    }
    if (options.credentials) {
      const { name, password } = options.credentials;
      this._credentials = `${name}${password ? ':' + password : ''}`;
    }
    this._identity = Promise.resolve(options.identity || new AnonymousIdentity());
  }

  public addTransform(fn: HttpAgentRequestTransformFn, priority = fn.priority || 0): void {
    // Keep the pipeline sorted at all time, by priority.
    const i = this._pipeline.findIndex(x => (x.priority || 0) < priority);
    this._pipeline.splice(i >= 0 ? i : this._pipeline.length, 0, Object.assign(fn, { priority }));
  }

  public async getPrincipal(): Promise<Principal> {
    return (await this._identity).getPrincipal();
  }

  public async call(
    canisterId: Principal | string,
    options: {
      methodName: string;
      arg: BinaryBlob;
      effectiveCanisterId?: Principal | string;
    },
    identity?: Identity | Promise<Identity>,
  ): Promise<SubmitResponse> {
    const id = (await (identity !== undefined ? await identity : await this._identity)) as Identity;
    const canister = Principal.from(canisterId);
    const ecid = options.effectiveCanisterId
      ? Principal.from(options.effectiveCanisterId)
      : canister;

    const sender: Principal = id.getPrincipal() || Principal.anonymous();

    const submit: CallRequest = {
      request_type: SubmitRequestType.Call,
      canister_id: canister,
      method_name: options.methodName,
      arg: options.arg,
      sender: sender,
      ingress_expiry: new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS),
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
    const [response, requestId] = await Promise.all([
      this._fetch('' + new URL(`/api/v2/canister/${ecid.toText()}/call`, this._host), {
        ...transformedRequest.request,
        body,
      }),
      requestIdOf(submit),
    ]);

    if (!response.ok) {
      throw new Error(
        `Server returned an error:\n` +
          `  Code: ${response.status} (${response.statusText})\n` +
          `  Body: ${await response.text()}\n`,
      );
    }

    return {
      requestId,
      response: {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      },
    };
  }

  public async query(
    canisterId: Principal | string,
    fields: QueryFields,
    identity?: Identity | Promise<Identity>,
  ): Promise<QueryResponse> {
    const id = await (identity !== undefined ? await identity : await this._identity);
    const canister = typeof canisterId === 'string' ? Principal.fromText(canisterId) : canisterId;
    const sender = id?.getPrincipal() || Principal.anonymous();

    const request: QueryRequest = {
      request_type: ReadRequestType.Query,
      canister_id: canister,
      method_name: fields.methodName,
      arg: fields.arg,
      sender: sender,
      ingress_expiry: new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS),
    };

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
    transformedRequest = await id.transformRequest(transformedRequest);

    const body = cbor.encode(transformedRequest.body);
    const response = await this._fetch(
      '' + new URL(`/api/v2/canister/${canister.toText()}/query`, this._host),
      {
        ...transformedRequest.request,
        body,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Server returned an error:\n` +
          `  Code: ${response.status} (${response.statusText})\n` +
          `  Body: ${await response.text()}\n`,
      );
    }
    return cbor.decode(Buffer.from(await response.arrayBuffer()));
  }

  public async readState(
    canisterId: Principal | string,
    fields: ReadStateOptions,
    identity?: Identity | Promise<Identity>,
  ): Promise<ReadStateResponse> {
    const canister = typeof canisterId === 'string' ? Principal.fromText(canisterId) : canisterId;
    const id = await (identity !== undefined ? await identity : await this._identity);
    const sender = id?.getPrincipal() || Principal.anonymous();

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
      endpoint: Endpoint.ReadState,
      body: {
        request_type: ReadRequestType.ReadState,
        paths: fields.paths,
        sender: sender,
        ingress_expiry: new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS),
      },
    });

    // Apply transform for identity.
    transformedRequest = await id.transformRequest(transformedRequest);

    const body = cbor.encode(transformedRequest.body);

    const response = await this._fetch(
      '' + new URL(`/api/v2/canister/${canister}/read_state`, this._host),
      {
        ...transformedRequest.request,
        body,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Server returned an error:\n` +
          `  Code: ${response.status} (${response.statusText})\n` +
          `  Body: ${await response.text()}\n`,
      );
    }
    return cbor.decode(Buffer.from(await response.arrayBuffer()));
  }

  public async status(): Promise<JsonObject> {
    const headers: Record<string, string> = this._credentials
      ? {
          Authorization: 'Basic ' + btoa(this._credentials),
        }
      : {};

    const response = await this._fetch('' + new URL(`/api/v2/status`, this._host), { headers });

    if (!response.ok) {
      throw new Error(
        `Server returned an error:\n` +
          `  Code: ${response.status} (${response.statusText})\n` +
          `  Body: ${await response.text()}\n`,
      );
    }

    const buffer = await response.arrayBuffer();
    return cbor.decode(new Uint8Array(buffer));
  }

  public async fetchRootKey(): Promise<BinaryBlob> {
    if (!this._rootKeyFetched) {
      // Hex-encoded version of the replica root key
      this.rootKey = blobFromUint8Array(((await this.status()) as any).root_key);
      this._rootKeyFetched = true;
    }
    return this.rootKey;
  }

  protected _transform(request: HttpAgentRequest): Promise<HttpAgentRequest> {
    let p = Promise.resolve(request);

    for (const fn of this._pipeline) {
      p = p.then(r => fn(r).then(r2 => r2 || r));
    }

    return p;
  }
}
