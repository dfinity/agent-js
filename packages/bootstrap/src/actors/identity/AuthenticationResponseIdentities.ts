import { AnonymousIdentity, makeLog, SignIdentity } from '@dfinity/agent';
import {
  DelegationChain,
  DelegationIdentity,
  response as icidResponse,
} from '@dfinity/authentication';
import { AuthenticationResponseDetectedEventIdentifier } from '@dfinity/authentication';

/**
 * AsyncIterable of Identities that can be generated as a result of handling
 * AuthenticationResponseDetectedEvent on a Document.
 * @param events - EventTarget to listen for AuthenticationResponseDetectedEvents
 */
export default function AuthenticationResponseIdentities(
  events: EventTarget,
): AsyncIterable<SignIdentity | AnonymousIdentity> {
  const log = makeLog('AuthenticationResponseIdentities');
  const identities: AsyncIterable<SignIdentity | AnonymousIdentity> = (async function* () {
    // Wait for AuthenticationResponseDetectedEvents
    for await (const event of AuthenticationResponseDetectedEventIterable(events)) {
      log('debug', 'handling AuthenticationResponseDetectedEvent', { event });
      if (!(event instanceof CustomEvent)) {
        log('warn', 'got unexpected event that is not a CustomEvent', { event });
        continue;
      }
      const url = event.detail.url;
      if (!(url instanceof URL)) {
        log('warn', 'got CustomEvent without URL', { event });
        continue;
      }
      const signFunction = event.detail.sign;
      if (typeof signFunction !== 'function') {
        throw new Error('no sign function');
      }
      log('debug', 'new signFunction is', signFunction);
      const identity = (() => {
        const response = icidResponse.fromQueryString(url.searchParams);
        const chain = DelegationChain.fromJSON(icidResponse.parseBearerToken(response.accessToken));
        const sessionIdentity: Pick<SignIdentity, 'sign'> = {
          async sign(challenge) {
            const signature = await signFunction(challenge);
            return signature;
          },
        };
        const delegationIdentity = DelegationIdentity.fromDelegation(sessionIdentity, chain);
        return delegationIdentity;
      })();
      log('debug', 'yielding', {
        identity,
        principalHex: identity.getPrincipal().toHex(),
      });
      yield identity;
    }
  })();
  return identities;
}

function AuthenticationResponseDetectedEventIterable(
  spec: Pick<Document, 'addEventListener'>,
): AsyncIterable<Event> {
  const events: AsyncIterable<Event> = (async function* () {
    while (true) {
      const nextEvent = await new Promise<Event>(resolve => {
        spec.addEventListener(AuthenticationResponseDetectedEventIdentifier, resolve, {
          once: true,
        });
      });
      yield nextEvent;
    }
  })();
  return events;
}
