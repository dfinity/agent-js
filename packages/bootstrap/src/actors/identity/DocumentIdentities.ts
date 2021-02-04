import {
  AnonymousIdentity,
  makeLog,
  SignIdentity,
} from '@dfinity/agent';
import {
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
  response as icidResponse,
} from '@dfinity/authentication';

/**
 * AsyncIterable of Identities that can be generated as a result of handling
 * AuthenticationResponseDetectedEvent on a Document.
 * @param events - EventTarget to listen for AuthenticationResponseDetectedEvents
 */
export default function DocumentIdentities(
  events: EventTarget,
): AsyncIterable<SignIdentity|AnonymousIdentity> {
  const log = makeLog('DocumentIdentities');
  const identities: AsyncIterable<SignIdentity | AnonymousIdentity> = (async function* () {
    // Wait for AuthenticationResponseDetectedEvents
    for await (const event of AuthenticationResponseDetectedEventIterable(events)) {
      log('debug', 'handling AuthenticationResponseDetectedEvent', {event});
      if (!(event instanceof CustomEvent)) {
        log('warn', 'got unexpected event that is not a CustomEvent', { event });
        continue;
      }
      const url = event.detail.url;
      if (!(url instanceof URL)) {
        log('warn', 'got CustomEvent without URL', { event });
        continue;
      }
      const identity = (() => {
        const response = icidResponse.fromQueryString(url.searchParams);
        const chain = DelegationChain.fromJSON(icidResponse.parseBearerToken(response.accessToken));
        const sessionIdentity = Ed25519KeyIdentity.generate();
        const delegationIdentity = DelegationIdentity.fromDelegation(sessionIdentity, chain);
        log('debug', 'created delegationIdentity', {
          publicKey: delegationIdentity.getPublicKey().toDer().toString('hex'),
        });
        return delegationIdentity;
      })();
      log('debug', 'about to yield', identity);
      yield identity;
    }
  })();
  return identities;
}

function AuthenticationResponseDetectedEventIterable(
  spec: Pick<Document, 'addEventListener'>,
): AsyncIterable<Event> {
  const idChangedEventName = 'https://internetcomputer.org/ns/authentication/AuthenticationResponseDetectedEvent' as const;
  const events: AsyncIterable<Event> = (async function* () {
    while (true) {
      const nextEvent = await new Promise<Event>(resolve => {
        spec.addEventListener(idChangedEventName, resolve, { once: true });
      });
      yield nextEvent;
    }
  })();
  return events;
}
