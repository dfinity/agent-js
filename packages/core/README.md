# @dfinity/core

This package provides the core functionality for interacting with the Internet Computer using JavaScript.

It contains and re-exports the following packages:

- [@dfinity/agent](../agent/README.md)
- [@dfinity/candid](../candid/README.md)
- [@dfinity/principal](../principal/README.md)
- [@dfinity/identity](../identity/README.md)
- [@dfinity/utils](https://github.com/dfinity/ic-js/blob/main/packages/utils/README.md)

## Installation

```bash
npm install @dfinity/core
```

## Usage

```js
import {
  Actor,
  HttpAgent,
  ECDSAKeyIdentity,
  uint8ArrayToBigInt,
  createAgent,
  toNullable,
} from '@dfinity/core';
```

All the good stuff is in here. More documentation coming soon.
