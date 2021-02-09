import { makeLog, isIdentityDescriptor, IdentityDescriptor } from '@dfinity/agent';
import { EventIterable } from '../id-dom-events/dom-events';

/**
 * AsyncIterable of new Identities used by @dfinity/bootstrap.
 * (This will only work if @dfinity/bootstrap's IdentityActor is running on the page.)
 * @param events - source of BootstrapIdentityChangedEvents
 * @yields new identities used by bootstrap
 */
export async function * IdentitiesIterable(events: Pick<EventTarget,'addEventListener'>): AsyncGenerator<IdentityDescriptor, void, unknown> {
  const log = makeLog('IdentitiesIterable');
  const BootstrapIdentityChangedEventName = 'https://internetcomputer.org/ns/authentication/BootstrapIdentityChangedEvent' as const;
  for await (const event of EventIterable(events, BootstrapIdentityChangedEventName, true)) {
    const detail = event && (event as CustomEvent)?.detail;
    if ( ! isIdentityDescriptor(detail)) {
      log('warn', 'got event whose detail does not appear to be an IdentityDescriptor. Skipping.')
      continue;
    }
    yield detail;
  }
}
