import { AnonymousIdentity, createIdentityDescriptor, SignIdentity } from '@dfinity/agent';
import {
  BootstrapChangeIdentityCommandIdentifier,
  IdentityDescriptor,
  IdentityRequestedEventIdentifier,
} from '@dfinity/authentication';
import { EventIterable } from '../../dom-events';
import { makeLog } from '../../log';
import { ChangeCommandIdentity, isBootstrapChangeIdentityCommand } from './BootstrapIdentities';
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
 * @param params.eventTarget - Will have BootstrapIdentityChangedEvent dispatched on it whenever
 *   identities emits a new value.
 * @param params.cancel - When/if this resolves, the actor should shut down.
 */
export default function IdentityActor(params: {
  initialIdentity: SignIdentity | AnonymousIdentity;
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

  /** Start the actor */
  async function start() {
    if (started) {
      throw new Error('Already started');
    }
    started = true;
    await Promise.all([
      handleIdentityRequestedEvents(),
      handleBootstrapChangeIdentityCommand(),
      // do this one last so all subscribers set up
      // trackLatestIdentity(),
    ]);
    started = false;
  }

  /**
   * Stop the Actor.
   */
  async function stop() {
    // http://seg.phault.net/blog/2018/03/async-iterators-cancellation/
    log('warn', 'stop isnt supported yet!');
    // @TODO give a cancellable promise to the subactors
    started = false;
  }

  async function useIdentity(identity: SignIdentity | AnonymousIdentity) {
    const prevIdentity = currentIdentity;
    log('debug', 'useIdentity', { prevIdentity, identity });
    currentIdentity = identity;
    const identityDescriptor = createIdentityDescriptor(identity);
    params.eventTarget.dispatchEvent(BootstrapIdentityChangedEvent(identityDescriptor));
    publish(IdentityMessage(identityDescriptor));
  }

  // /**
  //  * Whenever `identities` emits a new one, publish it to all subscribers.
  //  */
  // async function trackLatestIdentity() {
  //   for await (const identity of params.identities) {
  //     await useIdentity(identity);
  //   }
  // }

  /**
   * For each IdentityRequestedEvent, respond with the current identity,
   * and add the event/port to `subscribers` of future identities.
   */
  async function handleIdentityRequestedEvents() {
    const events = EventIterable(params.eventTarget, IdentityRequestedEventIdentifier, true);
    for await (const event of events) {
      log('debug', 'bootstrap-js window listener handling IdentityRequestedEvent', event);
      const detail = (event as CustomEvent).detail;
      const sender: undefined | MessagePort = detail && detail.sender;
      if (typeof sender?.postMessage === 'function') {
        const message = IdentityMessage(currentIdentity);
        subscribers.add(sender);
        sender.postMessage(message);
        log('debug', 'responded to IdentityRequestedEvent', { sender, message, subscribers });
      } else {
        log('warn', 'IdentityRequestedEvent did not contain a sender port');
      }
    }
  }

  async function handleBootstrapChangeIdentityCommand() {
    for await (const event of EventIterable(
      params.eventTarget,
      BootstrapChangeIdentityCommandIdentifier,
      true,
    )) {
      if (!isBootstrapChangeIdentityCommand(event)) {
        continue;
      }
      useIdentity(ChangeCommandIdentity(event));
    }
  }

  /**
   * Publish a message to all subscribers, e.g. to notify them of a new current Identity.
   * @param message - message to publish
   */
  function publish(message: ReturnType<typeof IdentityMessage>): void {
    log('debug', 'publishing', { message, subscribers });
    for (const port of subscribers) {
      port.postMessage(message);
    }
  }
}

function IdentityMessage(identity: IdentityDescriptor | SignIdentity | AnonymousIdentity) {
  return {
    identity: 'type' in identity ? identity : createIdentityDescriptor(identity),
  };
}
