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

note: if you are using `Secp256k1KeyIdentity`, you will also need to install `crypto-browserify` as a PeerDependency. It is left out of project dependencies to keep `@dfinity/identity` smaller.

### In the browser:

```
import * as identity from "@dfinity/identity";
```

or using individual exports:

```
import { ECDSAKeyIdentity, DelegationIdentity } from "@dfinity/identity";
```

### ECDSAKeyIdentity

Using an `ECDSAKeyIdentity`, you can now use the native Web Crypto API to manage your keys in `agent-js`. `ECDSAKeyIdentity` uses the crypto.subtle interface under the hood, and wraps the conventions for managing identities in the same way as other identities in this package.

Importantly, there is no importing from a private key or from JSON for this library. This should be used only in secure contexts, and you should only in rare circumstances interact directly with the KeyPair or CryptoKeys involved. Importantly, your CryptoKeys can be used in IndexedDb and can be created as `extractable` or `non-extractable` for enhanced security properties.

### Secp256k1KeyIdentity

This identity can be generated using the bip39 curve from a seed phrase, to produce a consistent identity across `dfx` and `agent-js`. In this package, import `Secp256k1KeyIdentity` and call `fromSeed`, passing in your seed. You can import the same seed in `dfx` by writing it to a file, and running `dfx identity import --seed-file <filename>`.

Depending on the security of what this identity controls, this should not be used carelessly. Even copy/pasting a phrase can be a risk, and you should make your best efforts to discourage your users from storing seed phrases digitally or using them in browser contexts that may be at risk of cross-site scripting.

#### In Node.js

Depending on your version, you may need to use a polyfill and set `global.crypto` in a setup file. If you prefer, you can also pass in a `subtleCrypto` implementation in methods that call for it, either as a direct argument, or in a `cryptoOptions` object.

Note: depends on [@dfinity/agent](https://www.npmjs.com/package/@dfinity/agent)
