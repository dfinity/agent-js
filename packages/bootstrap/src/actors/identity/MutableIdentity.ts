import {
  AnonymousIdentity,
  makeLog,
  SignIdentity,
} from '@dfinity/agent';

/**
 * An Identity that delegates to each new identity of an iterable of identities.
 * @param identities - iterable of identities to delegate to
 */
export default async function MutableIdentity(
  identities: AsyncIterable<SignIdentity | AnonymousIdentity>,
): Promise<SignIdentity | AnonymousIdentity> {
  const log = makeLog('MutableIdentity');
  log('debug', 'constructing MutableIdentity', identities);
  const initialIdentity = new AnonymousIdentity();
  let identity: AnonymousIdentity | SignIdentity = initialIdentity;
  (async () => {
    for await (const nextIdentity of identities) {
      identity = nextIdentity;
      log('debug', 'using newly generated identity: ', identity);
    }
  })();
  const identityProxy: SignIdentity | AnonymousIdentity = new Proxy(initialIdentity, {
    get(target, prop, receiver) {
      const currentIdentity = target || identity;
      return Reflect.get(currentIdentity, prop, receiver);
    },
  });
  return identityProxy;
}
