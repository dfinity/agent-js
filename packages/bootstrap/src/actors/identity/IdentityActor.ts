import { EventIterable } from '../../dom-events';
import { makeLog } from '../../log';
import { SignIdentity, AnonymousIdentity } from '@dfinity/agent';
import { BootstrapIdentityChangedEvent } from './events';
import { IdentityDescriptor as createIdentityDescriptor } from './IdentityDescriptor';
import { IdentityRequestedEventUrl, IdentityDescriptor } from '@dfinity/authentication';

/**
 * Keep track of end-user identity on the page.
 * events:
 *   receives
 *     dom:
 *       BootstrapIdentityRequestedEvent
 *       AuthenticationResponseDetectedEvent
 *   sends: BootstrapIdentityChangedEvent
 */
export default function IdentityActor(spec: {
  initialIdentity: SignIdentity | AnonymousIdentity;
  identities: AsyncIterable<AnonymousIdentity | SignIdentity>;
  eventTarget: EventTarget;
  cancel: Promise<any>;
}) {
  const log = makeLog('@dfinity/bootstrap/IdentityActor');
  const subscribers = new Set<MessagePort>();
  let started = false;
  let currentIdentity: SignIdentity | AnonymousIdentity = spec.initialIdentity;
  spec.cancel.then(() => {
    if (started) {
      stop();
    }
  });
  start();

  async function start() {
    if (started) throw new Error('Already started');
    started = true;
    await Promise.all([
      handleBootstrapIdentityRequestedEvents(),
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
    for await (const identity of spec.identities) {
      currentIdentity = identity;
      const identityDescriptor = createIdentityDescriptor(currentIdentity)
      log('debug', 'new currentIdentity', {currentIdentity,identityDescriptor})
      spec.eventTarget.dispatchEvent(BootstrapIdentityChangedEvent(
        identityDescriptor,
      ));
      publish(IdentityMessage(identityDescriptor));
    }
  }
  async function handleBootstrapIdentityRequestedEvents() {
    for await (const event of EventIterable(window, IdentityRequestedEventUrl)) {
      log('debug', 'bootstrap-js window listener handling BootstrapIdentityRequestedEvent', event);
      const detail = (event as CustomEvent).detail;
      const sender: undefined | MessagePort = detail && detail.sender;
      if (typeof sender?.postMessage === 'function') {
        const message = IdentityMessage(currentIdentity)
        log('debug', 'adding subscriber port', sender)
        subscribers.add(sender);
        log('debug', 'replying to BootstrapIdentityRequestedEvent with', message)
        sender.postMessage(message);
      } else {
        log('warn', 'BootstrapIdentityRequestedEvent did not contain a sender port');
      }
    }
  }
  function publish(message: ReturnType<typeof IdentityMessage>): void {
    log('debug', 'publishing', {message, subscribers})
    for (const port of subscribers) {
      port.postMessage(message);
    }
  }
}

function IdentityMessage(identity: IdentityDescriptor|SignIdentity|AnonymousIdentity) {
  return {
    identity: ('type' in identity) ? identity : createIdentityDescriptor(identity),
  }
}
