# @dfinity/identity-ledgerhq

TypeScript library to support a Hardware Ledger Wallet identity for applications on the [Internet Computer](https://dfinity.org/).

Visit the [Dfinity Forum](https://forum.dfinity.org/) and [SDK Documentation](https://sdk.dfinity.org/docs/index.html) for more information and support building on the Internet Computer.

---

## Installation

Using authentication:

```
npm i --save @dfinity/identity-ledgerhq
```

### In the browser:

```javascript
import { LedgerIdentity } from '@dfinity/identity-ledgerhq';

// ...
const identity = await LedgerIdentity.create();
const agent = new HttpAgent({ identity });
```

Note: depends on [@dfinity/agent](https://www.npmjs.com/package/@dfinity/agent) and
[@dfinity/identity](https://www.npmjs.com/package/@dfinity/identity).
