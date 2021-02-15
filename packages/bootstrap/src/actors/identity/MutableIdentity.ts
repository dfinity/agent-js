import { AnonymousIdentity, SignIdentity } from '@dfinity/agent';
import { makeLog } from '../../log';

/**
 * An Identity that delegates to each new identity of an iterable of identities.
 * @param identities - iterable of identities to delegate to
 * @param initialIdentity - initial Identity to use before identities yields
 */
export default async function MutableIdentity(
  identities: AsyncIterable<SignIdentity | AnonymousIdentity>,
  initialIdentity = new AnonymousIdentity(),
): Promise<SignIdentity | AnonymousIdentity> {
  const log = makeLog('MutableIdentity');
  let currentIdentity: AnonymousIdentity | SignIdentity = initialIdentity;
  function getCurrentIdentity() {
    return currentIdentity;
  }
  (async () => {
    for await (const nextIdentity of identities) {
      const prevIdentity = currentIdentity;
      currentIdentity = nextIdentity;
      log('debug', 'using newly generated identity: ', {
        prevIdentity,
        prevIdentityPrincipalHex: prevIdentity.getPrincipal().toHex(),
        currentIdentity,
        currentIdentityPrincipalHex: currentIdentity.getPrincipal().toHex(),
      });
    }
  })();
  const identityProxy: SignIdentity | AnonymousIdentity = new Proxy(
    /* note that this isn't actually ever used as the reflection target in `get(target)` method,
    the varying return value of getCurrentIdentity() is. */
    initialIdentity,
    {
      get(target, prop, receiver) {
        const returned = Reflect.get(getCurrentIdentity(), prop, receiver);
        return returned;
      },
    },
  );
  return identityProxy;
}
