import { isIdentityDescriptor, IdentityDescriptor } from '@dfinity/agent';
import { CallbackIterable } from '../id-dom-events/dom-events';
import { IdentityRequestedEvent } from '../id-dom-events';

function createCallbackIterable<T>(): {
  iterable: AsyncIterable<T>;
  push(value: T): void;
} {
  let push;
  const iterable = CallbackIterable<T>(listener => {
    push = listener;
  });
  return { iterable, push };
}

/**
 * AsyncIterable of new Identities used by @dfinity/bootstrap.
 * (This will only work if @dfinity/bootstrap's IdentityActor is running on the page.)
 * @param events - source of BootstrapIdentityChangedEvents
 * @yields new identities used by bootstrap
 */
export async function* IdentitiesIterable(
  events: Pick<EventTarget, 'addEventListener' | 'dispatchEvent'>,
): AsyncGenerator<IdentityDescriptor, void, undefined> {
  const { push, iterable } = createCallbackIterable<IdentityDescriptor>();
  const identityRequestedEvent = IdentityRequestedEvent({
    bubbles: true,
    composed: true,
    onIdentity(identity) {
      if (isIdentityDescriptor(identity)) {
        push(identity);
      }
    },
  });
  events.dispatchEvent(identityRequestedEvent);
  yield* iterable;
}
