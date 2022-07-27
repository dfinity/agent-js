# @dfinity/identity

JavaScript and TypeScript library to manage Identities and enable simple Web Authentication flows for applications on the [Internet Computer](https://dfinity.org/)

Visit the [Dfinity Forum](https://forum.dfinity.org/) and [SDK Documentation](https://sdk.dfinity.org/docs/index.html) for more information and support building on the Internet Computer.

Additional API Documentation can be found [here](https://agent-js.icp.xyz/identity/index.html).

---

## Installation

Using authentication:

```
npm i --save @dfinity/identity
```

### In the browser:

```
import * as identity from "@dfinity/identity";
```

or using individual exports:

```
import { WebAuthnIdentity } from "@dfinity/identity";
```

### ECDSAKeyIdentity

Using an `ECDSAKeyIdentity`, you can now use the native Web Crypto API to manage your keys in `agent-js`. `ECDSAKeyIdentity` uses the crypto.subtle interface under the hood, and wraps the conventions for managing identities in the same way as other identities in this package.

Importantly, there is no importing from a private key or from JSON for this library. This should be used only in secure contexts, and you should only in rare circumstances interact directly with the KeyPair or CryptoKeys involved. Importantly, your CryptoKeys can be used in IndexedDb and can be created as `extractable` or `non-extractable` for enhanced security properties.

#### In Node.js

Depending on your version, you may need to use a polyfill and set `global.crypto` in a setup file. If you prefer, you can also pass in a `subtleCrypto` implementation in methods that call for it, either as a direct argument, or in a `cryptoOptions` object.

Note: depends on [@dfinity/agent](https://www.npmjs.com/package/@dfinity/agent)
