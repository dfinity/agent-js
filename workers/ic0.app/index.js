import { getAssetFromKV, serveSinglePageApp } from '@cloudflare/kv-asset-handler';
import { Actor, HttpAgent, Principal } from '@dfinity/agent';

const DEBUG = true;

async function getAgent() {
  // The replica URL is stored as a JSON object in the KV store. By default this will fail
  // to make sure we don't deploy to the wrong worker by mistake.
  const REPLICA_URL = await Config.get("replicaUrl");

  if (!REPLICA_URL) {
    console.error(`'Config' KV store does not have a 'replicaUrl' value.`);
    throw new Error("Could not read KV store.");
  }

  // The agent used by EVERY Http Requests to canisters.
  return new HttpAgent({
    host: REPLICA_URL,
  });
}

addEventListener('fetch', event => {
  try {
    event.respondWith(handleEvent(event))
  } catch (e) {
    console.error(e.message || e.toString());
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 501,
        }),
      )
    }
    event.respondWith(new Response('Internal Error', { status: 502 }))
  }
})

/**
 * Try to resolve the Canister ID to contact in the domain name.
 * @param {string} hostname The domain name to look up.
 * @returns {Principal|null} A Canister ID or null if none were found.
 */
function maybeResolveCanisterIdFromHostName(hostname) {
  const maybeLocalhost = hostname.match(/^(?:.*\.)?([a-z0-9-]+)\.localhost$/);
  if (maybeLocalhost) {
    try {
      return Principal.fromText(maybeLocalhost[1]);
    } catch (e) {
      return null;
    }
  }

  const maybeIc0App = hostname.match(/^(?:.*\.)?([a-z0-9-]+)\.ic0\.app$/);
  if (maybeIc0App) {
    try {
      return Principal.fromText(maybeIc0App[1]);
    } catch (e) {
      return null;
    }
  }

  return null;
}

/**
 * Try to resolve the Canister ID to contact in the search params.
 * @param {URLSearchParams} searchParams The URL Search params.
 * @returns {Principal|null} A Canister ID or null if none were found.
 */
function maybeResolveCanisterIdFromSearchParam(searchParams) {
  const maybeCanisterId1 = searchParams.get("canisterId");
  if (maybeCanisterId1) {
    try {
      return Principal.fromText(maybeCanisterId1);
    } catch (e) {
      // Do nothing.
    }
  }

  return null;
}

/**
 * Try to resolve the Canister ID to contact from a URL string.
 * @param {string} urlString The URL in string format (normally from the request).
 * @returns {Principal|null} A Canister ID or null if none were found.
 */
function resolveCanisterIdFromUrl(urlString) {
  const url = new URL(urlString);
  return maybeResolveCanisterIdFromHostName(url.hostname)
      || maybeResolveCanisterIdFromSearchParam(url.searchParams);
}

/**
 * Try to resolve the Canister ID to contact from headers.
 * @param {Headers} headers Headers from the HttpRequest.
 * @returns {Principal|null} A Canister ID or null if none were found.
 */
function maybeResolveCanisterIdFromHeaders(headers) {
  const maybeHostHeader = headers.get("host");
  if (maybeHostHeader) {
    // Remove the port.
    const maybeCanisterId = maybeResolveCanisterIdFromHostName(maybeHostHeader.replace(/:\d+$/, ''));
    if (maybeCanisterId) {
      return maybeCanisterId;
    }
  }
  const maybeRefererHeader = headers.get("referer");
  if (maybeRefererHeader) {
    const maybeCanisterId = resolveCanisterIdFromUrl(maybeRefererHeader);
    if (maybeCanisterId) {
      return maybeCanisterId;
    }
  }

  return null;
}

function maybeResolveCanisterIdFromHttpRequest(request) {
  return maybeResolveCanisterIdFromHeaders(request.headers)
      || resolveCanisterIdFromUrl(request.url);
}

function canisterIdlFactory({ IDL }) {
  const HeaderField = IDL.Tuple(IDL.Text, IDL.Text);
  const HttpRequest = IDL.Record({
    method: IDL.Text,
    url: IDL.Text,
    headers: IDL.Vec(HeaderField),
    body: IDL.Vec(IDL.Nat8),
  });
  const HttpResponse = IDL.Record({
    status_code: IDL.Nat16,
    headers: IDL.Vec(HeaderField),
    body: IDL.Vec(IDL.Nat8),
    // We cannot support streaming in JavaScript.
  });

  return IDL.Service({
    http_request: IDL.Func([HttpRequest], [HttpResponse], ['query']),
  });
}

async function handleEvent(event) {
  const request = event.request;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api')) {
    const replicaUrl = new URL(url.pathname + url.search, await Config.get("replicaUrl"));

    // Forward to the replica as is.
    return await fetch(replicaUrl, request);
  }

  /**
   * We refuse any request to /_/*
   */
  if (url.pathname.startsWith('/_/')) {
    return new Response(null, { status: 404 });
  }

  /**
   * We try to do an HTTP Request query.
   */
  const maybeCanisterId = maybeResolveCanisterIdFromHttpRequest(request);

  if (maybeCanisterId) {
    try {
      const actor = Actor.createActor(canisterIdlFactory, {
        agent: await getAgent(),
        canisterId: maybeCanisterId,
      });
      const requestHeaders = [];
      for (const [key, value] of request.headers.entries()) {
        requestHeaders.push([key, value]);
      }

      const httpRequest = {
        method: request.method,
        url: url.pathname + url.search,
        headers: requestHeaders,
        body: [...new Uint8Array(request.arrayBuffer())],
      };
      const httpResponse = await actor.http_request(httpRequest);

      const responseHeaders = new Headers();
      for (const [key, value] of httpResponse.headers) {
        responseHeaders.append(key, value);
      }

      return new Response(new Uint8Array(httpResponse.body), {
        status: httpResponse.status_code,
        headers: responseHeaders,
      });
    } catch (e) {
      // Fallback to bootstrap assets.
    }
  }

  return await getAssetFromKV(event, { mapRequestToAsset: serveSinglePageApp });
}
