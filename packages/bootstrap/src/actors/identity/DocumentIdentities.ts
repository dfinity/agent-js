import { makeLog } from '../../log';
import { SignIdentity, AnonymousIdentity } from '@dfinity/agent';
import {
  response as icidResponse,
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from '@dfinity/authentication';

export default function DocumentIdentities(document: Document) {
  const log = makeLog('DocumentIdentities');
  const identities: AsyncIterable<SignIdentity | AnonymousIdentity> = (async function* () {
    // Wait for AuthenticationResponseDetectedEvents
    for await (const event of AuthenticationResponseDetectedEventIterable(document)) {
      log('debug', 'handling AuthenticationResponseDetectedEvent', {event})
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
      log('debug', 'about to yield', identity)
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
      const nextEvent = await new Promise<Event>((resolve, reject) => {
        spec.addEventListener(idChangedEventName, resolve, { once: true });
      });
      yield nextEvent;
    }
  })();
  return events;
}
