import { AnonymousIdentity, createIdentityDescriptor, makeLog, SignIdentity } from '@dfinity/agent';
import {
  AuthenticationResponseUrlDetectedEvent,
  BootstrapChangeIdentityCommandIdentifier,
  IdentityDescriptor,
  IdentityRequestedEventIdentifier,
} from '@dfinity/authentication';
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

  /** Start the actor */
  async function start() {
    if (started) {
      throw new Error('Already started');
    }
    started = true;
    await Promise.all([
      handleBootstrapChangeIdentityCommand(),
      handleIdentityRequestedEvents(),
      // do this one last so all subscribers set up
      trackLatestIdentity(),
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

  /**
   * Whenever `identities` emits a new one, publish it to all subscribers.
   */
  async function trackLatestIdentity() {
    for await (const identity of params.identities) {
      await useIdentity(identity);
    }
  }

  /**
   * For each IdentityRequestedEvent, respond with the current identity,
   * and add the event/port to `subscribers` of future identities.
   */
  async function handleIdentityRequestedEvents() {
    for await (const event of EventIterable(document, IdentityRequestedEventIdentifier, true)) {
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

  async function handleBootstrapChangeIdentityCommand() {
    for await (const event of EventIterable(
      document,
      BootstrapChangeIdentityCommandIdentifier,
      true,
    )) {
      log('debug', 'got handleBootstrapChangeIdentityCommand CustomEvent', { event });
      const detail: unknown = (event as CustomEvent).detail;
      if (typeof detail !== 'object') {
        continue;
      }
      const authenticationResponseString =
        hasOwnProperty(detail, 'authenticationResponse') && detail.authenticationResponse;
      if (typeof authenticationResponseString !== 'string') {
        log('debug', 'detail.authenticationResponse must be a string', detail);
        continue;
      }

      // const authenticationResponse = response.fromQueryString(
      //  new URL(authenticationResponseString).searchParams)
      // const parsedAccessToken = response.parseBearerToken(authenticationResponse.accessToken);

      const identity = hasOwnProperty(detail, 'identity') && detail.identity;
      const signFunction = hasOwnProperty(identity, 'sign') && identity.sign;
      if (typeof signFunction !== 'function') {
        log('debug', 'detail.sign must be a function', detail);
        continue;
      }
      log(
        'debug',
        'handleBootstrapChangeIdentityCommand redispatching AuthenticationResponseUrlDetectedEvent',
      );
      document.dispatchEvent(
        AuthenticationResponseUrlDetectedEvent({
          url: new URL(authenticationResponseString),
          sign: signFunction as AuthenticationResponseUrlDetectedEvent['detail']['sign'],
        }),
      );
      // const chain = DelegationChain.fromJSON(parsedAccessToken);
      // const sessionIdentity: Pick<SignIdentity, 'sign'> = {
      //   async sign(challenge) {
      //     const signature = await signFunction(challenge);
      //     return signature;
      //   },
      // };
      // const delegationIdentity = DelegationIdentity.fromDelegation(sessionIdentity, chain);
      // await useIdentity(delegationIdentity)
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

/**
 * Helper to check/assert object has prop.
 * Gratitude to https://fettblog.eu/typescript-hasownproperty/.
 * @param obj - object to check
 * @param prop - name of property to check for existence of.
 */
function hasOwnProperty<X, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return {}.hasOwnProperty.call(obj, prop);
}
