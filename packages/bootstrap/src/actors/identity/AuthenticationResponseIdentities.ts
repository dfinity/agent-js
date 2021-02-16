import { AnonymousIdentity, SignIdentity } from '@dfinity/agent';
import {
  DelegationChain,
  DelegationIdentity,
  response as icidResponse,
} from '@dfinity/authentication';
import { AuthenticationResponseUrlDetectedEventIdentifier } from '@dfinity/authentication';
import { EventIterable } from '../../dom-events';

/**
 * AsyncIterable of Identities that can be generated as a result of handling
 * AuthenticationResponseUrlDetectedEvent on a Document.
 * @param events - EventTarget to listen for AuthenticationResponseUrlDetectedEvents
 */
export default function AuthenticationResponseIdentities(
  events: EventTarget,
): AsyncIterable<SignIdentity | AnonymousIdentity> {
  const identities: AsyncIterable<SignIdentity | AnonymousIdentity> = (async function* () {
    // Wait for AuthenticationResponseUrlDetectedEvents
    const AuthnResponseEvents = () =>
      EventIterable(events, AuthenticationResponseUrlDetectedEventIdentifier);
    for await (const event of AuthnResponseEvents()) {
      if (!(event instanceof CustomEvent)) {
        continue;
      }
      const url = event.detail.url;
      if (!(url instanceof URL)) {
        continue;
      }

      const response = (() => {
        try {
          return icidResponse.fromQueryString(url.searchParams);
        } catch (error) {
          // @todo - check for well-known error, else re-throw
        }
      })();

      if (!response) {
        continue;
      }

      const signFunction = event.detail.sign;
      if (typeof signFunction !== 'function') {
        throw new Error('no sign function');
      }
      const identity = (() => {
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
      yield identity;
    }
  })();
  return identities;
}
