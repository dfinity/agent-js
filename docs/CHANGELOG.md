# Changelog

## [Unreleased]

### Added

* feat: adds `fromPem` method for `identity-secp256k1`
* feat: HttpAgent tracks a watermark from the latest readState call. Queries with signatures made before the watermark will be automatically retried, and rejected if they are still behind.
* feat: allow passing `DBCreateOptions` to `IdbStorage` constructor

## [1.0.1] - 2024-02-20

### Changed

*   fix: `Ed25519KeyIdentity` was not generating unique identities when no seed was provided. This issue was introduced in `v0.20.0-beta.0`. If your code was affected please upgrade to `>=1.0.1`
*   chore: export `AuthClientStorage` to aid with custom implementations

## [1.0.0]

### Added

- feat: new `CustomPath` class, better docs, and deprecating metadata path type for `CanisterStatus`

### Changed

*   chore: npm audit fix
*   fix: adds npm run build to publish script
*   chore: update Management Canister interface
*   feat: new `CustomPath` class, better docs, and deprecating metadata path type for `CanisterStatus`
*   chore: adding new controller to snapshot for e2e canister status

## [0.21.4]

### Changed

*   fix: edit to the post-release script
*   fix: export partial identity from index of @dfinity/identity
*   chore: npm update & bumping jest-environment-jsdom
*   feat: release automation changes
*   fix: distinguish remote dev environments from known hosts

## [0.21.0]

### Added

*   feat: introduces `ObservableLog` to `HttpAgent`. Allows subscribers to be notified of events from the agent without sending them directly to the console
*   feat: enhances `.from` methods on public key classes to support unknown types, including PublicKey instances, ArrayBuffer-like objects, DER encoded public keys, and hex strings. Also introduces a new `bufFromBufLike` util

### Changed

*   chore: exporting http errors
*   chore: cleaning up lint warnings
*   chore: cleans up github actions linting warnings
*   feat: replaces `secp256k1` npm package with `@noble/curves`
*   feat: introduces partial identities from public keys for authentication flows
*   fix: honor disableIdle flag
*   fix: add `github.dev` and `gitpod.io` to known hosts

## [0.20.2]

### Changed

*   chore: lowering prettier version for CI
*   fix: restoring localhost to list of known hosts

## [0.20.1]

### Changed

*   feat: retry query signature verification in case cache is stale

## [0.20.0]

### Added

*   feat: uses expirable map for subnet keys in `agent-js`, with a timeout of 1 hour
*   **feat!: node signature verification**  
This feature includes additional changes in support of testing and releasing the feature:  
    *   Mainnet e2e tests for queries and calls
    *   published counter canister
    *   New `HttpAgent` option - `verifyQuerySignatures`. Defaults to true, but allows you to opt out of verification. Useful for testing against older replica versions
    *   Introducing `ed25519` logic to agent for validating node signatures
    *   Standardizing around `@noble/curves` instead of tweetnacl in `@dfinity/identity`
    *   new export - hashOfMap from agent, matching the naming used in the interface specification
    *   new unit tests
    *   new Verify export on ed25519 because why not
    *   Adds support for `Uint8Arrays` in `Principal.from()`
    *   feat: introduces `ExpirableMap`, a utility class that will return values up until a configured expiry
    *   chore: increases size limit for `agent-js` to allow for `Ed25519` support for node key signature verification
    *   feat!: replaces `disableNonce` feature with `useQueryNonces`. Going forward, updates will use nonces, but queries and readstate calls will not. Queries and readsatate calls will use nonces if `useQueryNonces` is set to true
    *   feat: adds subnet metrics decoding to canisterStatus for `/subnet` path
    *   feat!: sets expiry to 1 minute less than the configured expiry, and then down to the nearest second. This matches existing behaviour, but adds the rounding

### Changed

*   chore: cleanup for node 20 development in `agent-js`
*   fix: `canisterStatus` returns full list of controllers
*   chore: replaces use of `localhost` with `127.0.0.1`for better node 18 support. Also swaps Jest for vitest, runs mitm against mainnet, and updates some packages
*   feat: retry logic will catch and retry for thrown errors
*   feat!: adds certificate logic to decode subnet and node key paths from the hashtree. Changes the interface for `lookup\_path` to allow returning a `HashTree`, but also constrains `lookup` response to an `ArrayBuffer` using a new `lookupResultToBuffer` export

## [0.19.3]

### Changed

*   fix: `Principal` JSON is compatible with `@dfinity/utils ``jsonReviver` helper
*   chore: npm audit
*   feat: `Principal` class serializes to JSON
*   feat: certificate checks validate that certificate time is not more than 5 minutes ahead of or behind system time.
*   feat: two new `leb` decoding utils added to `@dfinity/agent/utils/leb` to make it simpler to decode leb values and time from a certificate tree
*   chore: limit npm version to 9 in ci for compatibility with node 16
*   Adds more helpful error message for when principal is undefined during actor creation

## [0.19.2]

### Changed

*   fix: subdomains on `icp0.io` and `ic0.app` were incorrectly sending requests to `icp-api` and encountering CSP issues

## [0.19.1]

### Changed

*   fix: default host logic fixed and tests added

## [0.19.0]

### Changed

*   feat: replaces the `js-sha256` library with `@noble/hashes` due to a breaking bug in Chrome
*   Fix: add `@dfinity/principal` as a peerDependency to `assets` and `candid`.
*   Feat: `HttpAgent` now uses a default address of https://icp-api.io. Users will be warned for not setting a host, but the code will default to mainnet.
*   Feat: use webcrypto or node crypto instead of Math.random for nonce generation if available

## [0.18.1]

### Changed

*   fix: fix composite query in actor.ts
*   fix: handle new update call errors ([IC-1462](https://github.com/dfinity/interface-spec/pull/143))
*   chore: updates engines in package.json and recommended node version for development in nvmrc to support node 18+
*   chore: corrections to publishing docs
*   fix: typo in `JsonnableWebAuthnIdentitiy`, breaking change that requires users to update their imports to `JsonnableWebAuthnIdentity` when this type is used
*   fix: fix a bug in decoding service types, when function types come after the service type in the type table
*   feat: support `composite_query` in candid
*   fix: fix a bug in decoding service types, when function types come after the service type in the type table
*   feat: include boundary node http details to query and update calls
*   feat: adds method for actor creation that includes boundary node http details

## [0.15.7]

### Changed

*   Do not use `Headers` struct during init of HttpAgent for Node compatibility. Note: still supports use of Headers in application code

*   fix: finish all tasks before calling onSuccess auth callback in `@dfinity/auth-client`

## [0.15.6]

### Changed

*   feat: retry failed `read\_state` requests

## [0.15.5]

### Changed

*   add support for WebAuthn level 3 [authenticatorAttachment](https://w3c.github.io/webauthn/#dom-publickeycredential-authenticatorattachment)

## [0.15.4]

### Changed

*   removes more circular dependencies in agent, actor, proxy, and pollingstrategy
*   chore: updates distro for lint and prettier checks
*   removes more circular dependencies in agent, actor, proxy, and pollingstrategy
*   feat: adds keyType option for `AuthClient`, allowing users to specify whether to use an `ed25519` or `ECDSAKey`. This is important for custom storage providers that can't store `CryptoKey` objects
*   chore: removes a circular dependency on index for canisterStatus
*   chore: documents usage of fetch and fetchOptions for `HttpAgent`

## [0.15.3]

### Changed

*   reverts the `X-IC-Request-ID header` until we coordinate cors support with icx-proxy

## [0.15.2]

### Changed

*   Corrects some dev dependencies incorrectly listed as dependencies in `auth-client` package.json
*   introduces `X-IC-Request-ID header` to more easily identify retried requests. Also uses a standard Headers constructor to manage headers

Changes default stored key for `auth-client` to use ECDSAKey*   Also updates the storage interface types to support `CryptoKeyPair`

*   updates link to `identity-secp256k1` in docs site

## [0.15.1]

### Changed

*   fixes a package configuration issue with `@dfinity/identity-secp256k1`

## [0.15.0]

### Changed

*   _Breaking change:_ Moves `Secp256k1KeyIdentity` to its own package. `@dfinity/identity-secp256k1`
*   _Breaking change:_ Deprecates `@dfinity/authentication`. If you relied on the `isDelegationValid` check, it has been moved to `@dfinity/identity`
    
*   Deprecates `@dfinity/identity-ledgerhq`. Use `@zondax/ledger-icp` instead.
*   chore: links assets docs in index
*   chore: sets up new size-limit job for packages, in preparation for CI

## [0.14.1]

### Changed

*   feat: `secp256k1` now supports a `fromSeedPhrase` method that will reproduce the same identity across `agent-js`, `dfx`, and `quill`
*   chore: configures `unpkg` to use esmodules
*   chore: removes unused lint shell script
*   chore: adds `js-sha256` dependency to principal
*   bug: fixes idlemanager initializing - now either requires `createOptions.identity` or `authClient.login` to be called before starting idle timeout

## [0.14.0]

### Changed

*   Adds retry logic to `HttpAgent`. By default, retries three times before throwing an error, to offer a more cohesive workflow
*   Improves and truncates error messages in Candid
*   fixes flaky tests for syncTime
*   Adds a top-level `fetchCandid()` function which retrieves the Candid interface for a given canister id.
*   chore: `auth-client` expose storage constant keys
*   bug: `auth-client` resolves window.open issue in login function in safari due to async storage call
*   New package: @dfinity/assets. This package provides an asset manager to manage assets on an assets canister.
*   bug: `auth-client` storage wrapper returns after resolve to avoid idb to be recreated

## [0.13.3]

### Changed

*   New package: `@dfinity/bls-verify`. This package provides a pure-js implementation of BLS verification using the `miracl-core` package. This can be used to polyfill BLS verification for `agent-js`, but it is notably very slow (~3s per verification). Optimization may be possible with a significant refactoring
*   adds ability to polyfill bls verification in Certificate
*   Auth Client moves key fallback generation to the create method instead of login and makes the `\_key` non-nullable. This fixes a regression with async window.open behavior in Safari
*   `HttpAgent` now offers a method to sync time with the replica, provided a specific canister. This can be used to set proper `Expiry` times when a device has fallen out of sync with the replica.
*   Fixes a candid bug where when decoding, optional fields could be skipped if the data on the wire contains additional fields.

## [0.13.2]

### Changed

*   `auth-client` avoids localstorage global and can be used in a web worker or nodejs
*   bug: `auth-client` logout now awaits clearing storage

## [0.13.1]

### Changed

*   fixes a bug with the localstorage migration strategy

## [0.13.0]

### Changed

*   AuthClient now uses `IndexedDb` by default. To use localStorage, import LocalStorage provider and pass it during `AuthClient.create()`.

*   Also offers a generic `IndexedDb` keyval store, `IdbKeyVal`

*   `AuthClient` migrates gracefully from localstorage to IDB when upgrading

## [0.12.2]

### Changed

*   Support for the `SubtleCrypto` interface in `@dfinity/identity` using the new `ECDSAKeyIdentity`
*   `CanisterStatus` no longer suppresses rootKey errors
*   Readme's point to https://agent-js.icp.xyz

## [0.12.1]

### Changed

*   Adds inline sourcemaps to packages
*   Pulls lint out to a separate job now that Node 12 is failing with latest eslint dependencies
*   Adds `UTF-8` as an encoding option for `CanisterStatus` custom paths
*   Adds a public method `createReadStateRequest` that creates the request for `readState`.
*   Add an extra parameter to `readState` to pass a created request. If this parameter is passed, the method does the request directly without creating a new one.
*   Use the `createReadStateRequest` and the extra parameter when polling for the response to avoid signing requests during polling.
*   Adds `derivationOrigin` to `auth-client` login to support the ability to login using the identity derived from a different origin. See [proposed changes](https://github.com/dfinity/internet-identity/pull/724/files#diff-44c106928503ccfb1b3f09f02513578552f66b68dea01c5ec4bd2de858bbba1a)

## [0.12.0]

### Changed

*   Changed the certificate verification interface and fixed its logic. The public constructor is now static and asynchronous. There is no separate verification method, the check is done automatically in the constructor and newly also checks that the delegation is authoritative for the given canister ID, as required by the Internet Computer interface specification.

## [0.11.2]

### Changed

*   Adds a default callback to the `IdleManager` that will refresh the page after clearing the storage
*   Adds a new utility method, `canisterStatus`, to `agent-js`. Canister status now allows you to query paths from the canister certificate with a simple interface, using the API from the[interface specification](https://internetcomputer.org/docs/current/references/ic-interface-spec#state-tree-canister-information)  
    Comes with nicely configured options for
    
    `time`, `controllers`, `subnet`, `module_hash`, `candid`. Additionally, has a utility for reading custom MetaData set using [ic-wasm](https://github.com/dfinity/ic-wasm), as well as generic custom paths in the format of ArrayBuffers.
*   updates to package.json files for metadata in npm

## [0.11.1]

### Changed

*   Fix for a corner case that could lead to incorrect decoding of record types.

## [0.11.0]

### Changed

*   makeNonce now returns unique values. Previously only the first byte of the nonce was populated.
*   Introduces `IdleManager` to the `auth-client`. You can now use it to detect when the user has been idle for a configurable amount of time, and then to register callbacks for the sake of logging the user out and prompting re-authentication. See the `@dfinity/auth-client` Readme for more details
*   Reduces the `maxTimeToLive` default setting from 24 hours to 8
*   Versioning tool now sets patch version to 0 for minor version updates, or patch and minor versions to 0 for major version updates
*   Removes jest-expect-message, which was making test error messages less useful
*   `HttpAgent` now generates a nonce to ensure that calls are unique by default. If you want to opt out or provide your own nonce logic, you can now pass an option of `disableNonce: true`during the agent initialization.
    
    If you are currently using `agent.addTransform(makeNonceTransform())` , please note that you should remove that logic, or add the `disableNonce` option to your agent when upgrading.
    

## [0.10.3]

### Changed

*   Candid now allows optional records to be omitted. See https://github.com/dfinity/agent-js/issues/524
*   In `auth-client`, login `onSuccess` callback and `onError` callback now supports async pattern.
*   Updates npm dependencies to resolve warnings for typedoc and node-fetch. No runtime dependencies were affected.

## [0.10.2]

### Changed

*   Security enhancement - adds a rewrite for urls to subdomains of
    
    `\*.ic0.app/api`
    
    to
    
    `ic0.app/api`
    
*   Improves error messages for when `HttpAgent` cannot infer `fetch` implementation

## [0.10.1]

### Changed

*   Fix for the `auth-client` identity option and added JSDOC comment for the `timeToLive` option
*   Sets the default Internet Identity expiration to 1 day for the `authClient`, up from 15 minutes
*   No longer checks instanceof `Principal` in `@dfinity/agent`, which should allow non-identical versions of packages to interoperate, as long as they share the same API

## [0.10.0]

### Changed

*   Adds changelog for `agent-js` packages
*   `Buffer` and `Pipe` refactor
    *   In previous versions of dfinity packages, we relied on `Buffer`, a polyfilled version of the Node.js `Buffer` utility. In a significant refactor, we have removed all cases of this, along with `Pipe` and the nonstandard `Blob` packages, in favor of `ArrayBuffer`, `Uint8Array`, and `DataView`
    *   Utility methods such as `blobToUint8Array` have been removed.
    *   Interfaces that relied on `Buffer` and related packages have been updated to accept `ArrayBuffer`, and the type interfaces are updated to reflect this
*   `Secp256k1` Support
    *   Adds two new exports to `@dfinity/identity` - `Secp256k1KeyIdentity` and `Secp256k1PublicKey`
    *   API mirrors the `ed25519` components, and relies on the [secp256k1](https://www.npmjs.com/package/secp256k1) npm package for signing and verification.
