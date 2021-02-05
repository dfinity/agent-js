import { AnonymousIdentity, makeLog, SignIdentity } from '@dfinity/agent';

/**
 * An Identity that delegates to each new identity of an iterable of identities.
 * @param identities - iterable of identities to delegate to
 */
export default async function MutableIdentity(
  identities: AsyncIterable<SignIdentity | AnonymousIdentity>,
): Promise<SignIdentity | AnonymousIdentity> {
  const log = makeLog('MutableIdentity');
  log('debug', 'constructing MutableIdentity 1', identities);
  const initialIdentity = new AnonymousIdentity();
  let identity: AnonymousIdentity | SignIdentity = initialIdentity;
  (async () => {
    for await (const nextIdentity of identities) {
      identity = nextIdentity;
      log('debug', 'using newly generated identity: ', {
        identity,
        principalHex: identity.getPrincipal().toHex(),
      });
    }
  })();
  const identityProxy: SignIdentity | AnonymousIdentity = new Proxy(initialIdentity, {
    get(target, prop, receiver) {
      log('debug', 'identityProxy accessing prop', { target, prop, receiver });
      // https://stackoverflow.com/a/53890904
      // if (prop === 'then') { return null }
      const currentIdentity = identity;
      log('debug', 'identityProxy about to reflect', { currentIdentity, prop, receiver })
      const returned = Reflect.get(currentIdentity, prop, receiver);
      log('debug', 'identityProxy accessed prop', { target, prop, receiver, returned, currentIdentity });
      if (typeof returned === 'function') {
        return returned.bind(currentIdentity)
      }
      return returned;
    },
  });
  return identityProxy;
}
