import { Buffer } from 'buffer/';
import { ActorFactory } from '../actor';
import * as actor from '../actor';
import { AnonymousIdentity, Identity } from '../auth';
import * as cbor from '../cbor';
import { Expiry } from '../http_agent_transforms';
import {
  Endpoint,
  HttpAgentRequest,
  HttpAgentRequestTransformFn,
  HttpAgentSubmitRequest,
  QueryFields,
  QueryResponse,
  ReadRequest,
  ReadRequestType,
  ReadResponse,
  ReadStateFields,
  ReadStateResponse,
  SubmitRequest,
  SubmitRequestType,
  SubmitResponse,
} from '../http_agent_types';
import * as IDL from '../idl';
import { Principal } from '../principal';
import { requestIdOf } from '../request_id';
import { BinaryBlob, blobFromHex, JsonObject } from '../types';
import { Agent } from './api';
import { makeLog } from '../log';

const API_VERSION = 'v1';

// Default delta for ingress expiry is 5 minutes.
const DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS = 5 * 60 * 1000;

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

  #log = makeLog('HttpAgent')

  constructor(options: HttpAgentOptions = {}) {
    if (options.source) {
      this._pipeline = [...options.source._pipeline];
      this._identity = options.source._identity;
      this._fetch = options.source._fetch;
      this._host = options.source._host;
      this._credentials = options.source._credentials;
    } else {
      this._fetch = options.fetch || getDefaultFetch() || fetch.bind(global);
    }
    if (options.host) {
      if (!options.host.match(/^[a-z]+:/) && typeof window !== 'undefined') {
        this._host = new URL(window.location.protocol + '//' + options.host);
      } else {
        this._host = new URL(options.host);
      }
    } else if (options.source) {
      // Safe to ignore here.
      this._host = options.source._host;
    } else {
      const location = window?.location;
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

  public async getPrincipal(): Promise<Principal | null> {
    return this._identity ? (await this._identity).getPrincipal() : Principal.anonymous();
  }

  public async call(
    canisterId: Principal | string,
    fields: {
      methodName: string;
      arg: BinaryBlob;
    },
    identity?: Identity | Promise<Identity>,
  ): Promise<SubmitResponse> {
    this.#log('debug', 'call', { canisterId, fields, identity })
    const id = await (identity !== undefined ? identity : this._identity);
    const sender = id?.getPrincipal() || Principal.anonymous();
    return this.submit(
      {
        request_type: SubmitRequestType.Call,
        canister_id: typeof canisterId === 'string' ? Principal.fromText(canisterId) : canisterId,
        method_name: fields.methodName,
        arg: fields.arg,
        sender: sender.toBlob(),
        ingress_expiry: new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS),
      },
      id,
    );
  }

  public async install(
    canisterId: Principal | string,
    fields: {
      module: BinaryBlob;
      arg?: BinaryBlob;
    },
    identity?: Identity | Promise<Identity>,
  ): Promise<SubmitResponse> {
    const id = await (identity || this._identity);
    const sender = id?.getPrincipal() || Principal.anonymous();
    return this.submit(
      {
        request_type: SubmitRequestType.InstallCode,
        canister_id: typeof canisterId === 'string' ? Principal.fromText(canisterId) : canisterId,
        module: fields.module,
        arg: fields.arg || blobFromHex(''),
        sender: sender.toBlob(),
        ingress_expiry: new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS),
      },
      id,
    );
  }

  public async createCanister(identity?: Identity | Promise<Identity>): Promise<SubmitResponse> {
    const id = await (identity || this._identity);
    const sender = id?.getPrincipal() || Principal.anonymous();

    return this.submit(
      {
        request_type: SubmitRequestType.CreateCanister,
        sender: sender.toBlob(),
        ingress_expiry: new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS),
      },
      id,
    );
  }

  public async query(
    canisterId: Principal | string,
    fields: QueryFields,
    identity?: Identity | Promise<Identity>,
  ): Promise<QueryResponse> {
    const id = await (identity || this._identity);
    const sender = id?.getPrincipal() || Principal.anonymous();

    return this.read(
      {
        request_type: ReadRequestType.Query,
        canister_id: typeof canisterId === 'string' ? Principal.fromText(canisterId) : canisterId,
        method_name: fields.methodName,
        arg: fields.arg,
        sender: sender.toBlob(),
        ingress_expiry: new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS),
      },
      id,
    ) as Promise<QueryResponse>;
  }

  public async readState(
    fields: ReadStateFields,
    identity?: Identity | Promise<Identity>,
  ): Promise<ReadStateResponse> {
    const id = await (identity || this._identity);
    const sender = id?.getPrincipal() || Principal.anonymous();

    return this.read(
      {
        request_type: ReadRequestType.ReadState,
        paths: fields.paths,
        sender: sender.toBlob(),
        ingress_expiry: new Expiry(DEFAULT_INGRESS_EXPIRY_DELTA_IN_MSECS),
      },
      id,
    ) as Promise<ReadStateResponse>;
  }

  public async status(): Promise<JsonObject> {
    const headers: Record<string, string> = this._credentials
      ? {
          Authorization: 'Basic ' + btoa(this._credentials),
        }
      : {};

    const response = await this._fetch(
      '' + new URL(`/api/${API_VERSION}/${Endpoint.Status}`, this._host),
      { headers },
    );

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

  public makeActorFactory(actorInterfaceFactory: IDL.InterfaceFactory): ActorFactory {
    return actor.makeActorFactory(actorInterfaceFactory);
  }

  protected _transform(request: HttpAgentRequest): Promise<HttpAgentRequest> {
    let p = Promise.resolve(request);

    for (const fn of this._pipeline) {
      p = p.then(r => fn(r).then(r2 => r2 || r));
    }

    return p;
  }

  protected async submit(submit: SubmitRequest, identity: Identity): Promise<SubmitResponse> {
    this.#log('debug', 'submit', { submit, identity })
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
      endpoint: Endpoint.Submit,
      body: submit,
    })) as HttpAgentSubmitRequest;

    // Apply transform for identity.
    transformedRequest = await identity.transformRequest(transformedRequest);

    const body = cbor.encode(transformedRequest.body);

    // Run both in parallel. The fetch is quite expensive, so we have plenty of time to
    // calculate the requestId locally.
    const [response, requestId] = await Promise.all([
      this._fetch('' + new URL(`/api/${API_VERSION}/${Endpoint.Submit}`, this._host), {
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

  protected async read(request: ReadRequest, identity: Identity): Promise<ReadResponse> {
    this.#log('debug', 'read', {request, identity, identityPrincipalHex: identity.getPrincipal().toHex()})
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
      endpoint: Endpoint.Read,
      body: request,
    });

    // Apply transform for identity.
    transformedRequest = await identity.transformRequest(transformedRequest);

    const body = cbor.encode(transformedRequest.body);

    const response = await this._fetch(
      '' + new URL(`/api/${API_VERSION}/${Endpoint.Read}`, this._host),
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
}
