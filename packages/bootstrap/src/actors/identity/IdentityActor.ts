import {
  AnonymousIdentity,
  createIdentityDescriptor,
  makeLog,
  SignIdentity,
} from '@dfinity/agent';
import { IdentityDescriptor, IdentityRequestedEventUrl } from '@dfinity/authentication';
import { EventIterable } from '../../dom-events';
import { BootstrapIdentityChangedEvent } from './events';

/**
 * Keep track of end-user identity on the page.
 * events:
 *   receives
 *     dom:
 *       IdentityRequestedEvent
 *       AuthenticationResponseDetectedEvent
 *   sends: BootstrapIdentityChangedEvent
 * @param params params
 * @param params.initialIdentity - Identity to use from the very beginning before others are
 *   detected, e.g. AnonymousIdentity
 * @param params.identities - AsyncIterable of future identities that are changed to
 *   e.g. because of login events.
 * @param params.eventTarget - Will have BootstrapIdentityChangedEvent dispatched on it whenever
 *   identities emits a new value.
 * @param params.cancel - When/if this resolves, the actor should shut down.
 */
export default function IdentityActor(params: {
  initialIdentity: SignIdentity | AnonymousIdentity;
  identities: AsyncIterable<AnonymousIdentity | SignIdentity>;
  eventTarget: EventTarget;
  cancel: Promise<unknown>;
}): void {
  const log = makeLog('@dfinity/bootstrap/IdentityActor');
  const subscribers = new Set<MessagePort>();
  let started = false;
  let currentIdentity: SignIdentity | AnonymousIdentity = params.initialIdentity;
  params.cancel.then(() => {
    if (started) {
      stop();
    }
  });
  start();

  async function start() {
    if (started) { throw new Error('Already started'); }
    started = true;
    await Promise.all([
      handleIdentityRequestedEvents(),
      // do this one last so all subscribers set up
      trackLatestIdentity(),
    ]);
    started = false;
  }
  async function stop() {
    // http://seg.phault.net/blog/2018/03/async-iterators-cancellation/
    log('warn', 'stop isnt supported yet!');
    // @TODO give a cancellable promise to the subactors
    started = false;
  }
  async function trackLatestIdentity() {
    for await (const identity of params.identities) {
      currentIdentity = identity;
      const identityDescriptor = createIdentityDescriptor(currentIdentity);
      log('debug', 'new currentIdentity', {currentIdentity, identityDescriptor});
      params.eventTarget.dispatchEvent(BootstrapIdentityChangedEvent(
        identityDescriptor,
      ));
      publish(IdentityMessage(identityDescriptor));
    }
  }
  async function handleIdentityRequestedEvents() {
    for await (const event of EventIterable(document, IdentityRequestedEventUrl, true)) {
      log('debug', 'bootstrap-js window listener handling IdentityRequestedEvent', event);
      const detail = (event as CustomEvent).detail;
      const sender: undefined | MessagePort = detail && detail.sender;
      if (typeof sender?.postMessage === 'function') {
        const message = IdentityMessage(currentIdentity);
        log('debug', 'adding subscriber port', sender);
        subscribers.add(sender);
        log('debug', 'replying to IdentityRequestedEvent with', message);
        sender.postMessage(message);
      } else {
        log('warn', 'IdentityRequestedEvent did not contain a sender port');
      }
    }
  }
  function publish(message: ReturnType<typeof IdentityMessage>): void {
    log('debug', 'publishing', {message, subscribers});
    for (const port of subscribers) {
      port.postMessage(message);
    }
  }
}

function IdentityMessage(identity: IdentityDescriptor|SignIdentity|AnonymousIdentity) {
  return {
    identity: ('type' in identity) ? identity : createIdentityDescriptor(identity),
  };
}
