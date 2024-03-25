# @dfinity/bls-verify

`**Warning** this package is deprecated`

Package wrapping the @noble/bls-12-381 pure JS BLS verification implementation for use in `agent-js`. This is useful in contexts like React Native, where wasm implementations of BLS verification are not supported.

Visit the [Dfinity Forum](https://forum.dfinity.org/) and [SDK Documentation](https://sdk.dfinity.org/docs/index.html) for more information and support building on the Internet Computer.

Additional API Documentation can be found [here](https://agent-js.icp.xyz/candid/index.html).

---

## Installation

Using Principal:

```
npm i --save @dfinity/bls-verify
```

## To use in your application

```ts
import { blsVerify } from '@dfinity/bls-verify';
import { createActor, canisterId } from '../declarations/example';

const exampleActor = createActor(canisterId, {
  actorOptions: {
    blsVerify,
  },
});
```
