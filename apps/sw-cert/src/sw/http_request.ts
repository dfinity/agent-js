/**
 * Implement the HttpRequest to Canisters Proposal.
 *
 * TODO: Add support for streaming.
 */
import { Actor, IDL, HttpAgent, Principal } from '@dfinity/agent';

async function getAgent() {
  const replicaUrl = new URL("http://localhost:8000");
  return new HttpAgent({ host: replicaUrl.toString() });
}

/**
 * Try to resolve the Canister ID to contact in the domain name.
 * @param hostname The domain name to look up.
 * @returns A Canister ID or null if none were found.
 */
function maybeResolveCanisterIdFromHostName(hostname: string): Principal | null {
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
 * @param searchParams The URL Search params.
 * @returns A Canister ID or null if none were found.
 */
function maybeResolveCanisterIdFromSearchParam(searchParams: URLSearchParams): Principal | null {
  const maybeCanisterId = searchParams.get("canisterId");
  if (maybeCanisterId) {
    try {
      return Principal.fromText(maybeCanisterId);
    } catch (e) {
      // Do nothing.
    }
  }

  return null;
}

/**
 * Try to resolve the Canister ID to contact from a URL string.
 * @param urlString The URL in string format (normally from the request).
 * @returns A Canister ID or null if none were found.
 */
function resolveCanisterIdFromUrl(urlString: string): Principal | null {
  const url = new URL(urlString);
  return maybeResolveCanisterIdFromHostName(url.hostname)
    || maybeResolveCanisterIdFromSearchParam(url.searchParams);
}

/**
 * Try to resolve the Canister ID to contact from headers.
 * @param headers Headers from the HttpRequest.
 * @returns A Canister ID or null if none were found.
 */
function maybeResolveCanisterIdFromHeaders(headers: Headers): Principal | null {
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

function maybeResolveCanisterIdFromHttpRequest(request: Request) {
  return resolveCanisterIdFromUrl(request.referrer)
    || maybeResolveCanisterIdFromHeaders(request.headers)
    || resolveCanisterIdFromUrl(request.url);
}

const canisterIdlFactory: IDL.InterfaceFactory = ({ IDL }) => {
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
    // TODO: Support streaming in JavaScript.
  });

  return IDL.Service({
    http_request: IDL.Func([HttpRequest], [HttpResponse], ['query']),
  });
}

/**
 * Box a request, send it to the canister, and handle its response, creating a Response
 * object.
 * @param request The request received from the browser.
 * @returns The response to send to the browser.
 * @throws If an internal error happens.
 */
export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  /**
   * We forward all requests to /api/ to the replica, as is.
   */
  if (url.pathname.startsWith('/api/')) {
    return await fetch(request);
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
      const requestHeaders: [string, string][] = [];
      request.headers.forEach((key, value) => requestHeaders.push([key, value]));

      const httpRequest = {
        method: request.method,
        url: url.pathname + url.search,
        headers: requestHeaders,
        body: [...new Uint8Array(await request.arrayBuffer())],
      };
      const httpResponse: any = await actor.http_request(httpRequest);

      const responseHeaders = new Headers();
      for (const [key, value] of httpResponse.headers) {
        responseHeaders.append(key, value);
      }

      return new Response(new Uint8Array(httpResponse.body), {
        status: httpResponse.status_code,
        headers: responseHeaders,
      });
    } catch (e) {
      console.error("An error happened:", e);
      return new Response(null, { status: 500 });
    }
  }

  console.error("Could not find the canister ID.");
  return new Response(null, { status: 404 });
}
