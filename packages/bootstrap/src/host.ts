import {
  Agent,
  HttpAgent,
  makeExpiryTransform,
  makeNonceTransform,
  ProxyAgent,
  ProxyMessage,
} from '@dfinity/agent';
import { SiteInfo } from './site';

/**
 * Create an Internet Computer agent for use by bootstrap.
 * @param site - Describes the web page bootstrap is loading in.
 */
export async function createAgent(site: SiteInfo): Promise<Agent> {
  const workerHost = site.isUnknown() ? undefined : await site.getWorkerHost();
  const host = await site.getHost();

  if (!workerHost) {
    const identity = await site.getOrCreateUserIdentity();
    const creds = await site.getLogin();

    const agent = new HttpAgent({
      host,
      ...(creds && { credentials: { name: creds[0], password: creds[1] } }),
      identity,
    });
    agent.addTransform(makeNonceTransform());
    agent.addTransform(makeExpiryTransform(5 * 60 * 1000));

    return agent;
  } else {
    return createWorkerAgent(site, workerHost, host);
  }
}

async function createWorkerAgent(site: SiteInfo, workerHost: string, host: string): Promise<Agent> {
  // Create the IFRAME.
  let messageQueue: ProxyMessage[] | null = [];
  let loaded = false;
  const agent = new ProxyAgent((msg: ProxyMessage) => {
    if (!loaded) {
      if (!messageQueue) {
        throw new Error('No Message Queue but need Queueing...');
      }
      messageQueue.push(msg);
    } else {
      iframeEl.contentWindow?.postMessage(msg, '*');
    }
  });

  const iframeEl = document.createElement('iframe');

  iframeEl.src = `${workerHost}/worker.html?${host ? 'host=' + encodeURIComponent(host) : ''}`;
  window.addEventListener('message', ev => {
    if (ev.origin === workerHost) {
      switch (ev.data) {
        case 'ready': {
          const q = messageQueue?.splice(0, messageQueue.length) || [];
          for (const msg of q) {
            iframeEl.contentWindow?.postMessage(msg, workerHost);
          }

          loaded = true;
          messageQueue = null;
          break;
        }
        case 'login': {
          const url = new URL(workerHost);
          url.pathname = '/login.html';
          url.searchParams.append('redirect', '' + window.location);
          window.location.replace('' + url);
          break;
        }
        default:
          if (typeof ev.data === 'object') {
            agent.onmessage(ev.data);
          } else {
            throw new Error('Invalid message from worker: ' + JSON.stringify(ev.data));
          }
      }
    }
  });

  document.head.append(iframeEl);
  return agent;
}
