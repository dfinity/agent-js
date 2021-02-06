import { AnonymousIdentity, blobFromUint8Array, SignIdentity } from '@dfinity/agent';
import {
  BootstrapChangeIdentityCommand,
  BootstrapChangeIdentityCommandIdentifier,
  DelegationChain,
  DelegationIdentity,
  response,
} from '@dfinity/authentication';
import { EventIterable } from '../../dom-events';

/**
 * Map a stream of DOM Events to a stream of Identitys
 * produced from BootstrapChangeIdentityCommand CustomEvents
 *
 * @param events - AsyncIterable of DOM Events.
 * @yields a stream of SignIdentity objects created from the events
 */
export async function* ChangeCommandEventIdentities(
  events: AsyncIterable<Event>,
): AsyncIterable<SignIdentity | AnonymousIdentity> {
  for await (const event of events) {
    if (!isBootstrapChangeIdentityCommand(event)) {
      continue;
    }
    const identity = ChangeCommandIdentity(event);
    yield identity;
  }
}

/**
 * Given one BootstrapChangeIdentityCommand, return resulting DelegationIdentity
 * @param command - BootstrapChangeIdentityCommand
 */
export function ChangeCommandIdentity(command: BootstrapChangeIdentityCommand): DelegationIdentity {
  const authenticationResponse = response.fromQueryString(
    new URL(command.detail.authenticationResponse).searchParams,
  );
  const responseIdentity = (() => {
    const chain = DelegationChain.fromJSON(
      response.parseBearerToken(authenticationResponse.accessToken),
    );
    const sessionIdentity: Pick<SignIdentity, 'sign'> = {
      async sign(challenge: ArrayBuffer) {
        const signature = await command.detail.identity.sign(challenge);
        return blobFromUint8Array(new Uint8Array(signature));
      },
    };
    const delegationIdentity = DelegationIdentity.fromDelegation(sessionIdentity, chain);
    return delegationIdentity;
  })();
  return responseIdentity;
}

/**
 * Type Guard for BootstrapChangeIdentityCommand
 * @param event - maybe BootstrapChangeIdentityCommand
 */
export function isBootstrapChangeIdentityCommand(
  event: unknown,
): event is BootstrapChangeIdentityCommand {
  if (!event) {
    return false;
  }
  if ((event as BootstrapChangeIdentityCommand).type !== BootstrapChangeIdentityCommandIdentifier) {
    return false;
  }
  return true;
}

/**
 * AsyncIterable of identities bootstrap should use.
 * @param eventTarget - target to watch for DOM Events like BootstrapChangeIdentityCommand
 */
export function BootstrapIdentities(
  eventTarget: EventTarget): AsyncIterable<SignIdentity|AnonymousIdentity> {
  const events = EventIterable(eventTarget, BootstrapChangeIdentityCommandIdentifier);
  const identities = ChangeCommandEventIdentities(events);
  return identities;
}
