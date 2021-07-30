# @dfinity/authentication

JavaScript and TypeScript library to support manage Identities and enable simple Web Authentication flows for applications on the [Internet Computer](https://dfinity.org/)

Visit the [Dfinity Forum](https://forum.dfinity.org/) and [SDK Documentation](https://sdk.dfinity.org/docs/index.html) for more information and support building on the Internet Computer.

Additional API Documentation can be found [here](https://peacock.dev/authentication-docs).

---

## Installation

Using authentication:

```
npm i --save @dfinity/authentication
```

### In the browser:

```
import * as auth from "@dfinity/authentication";
```

or using individual exports:

```
import { createAuthenticationRequestUrl } from "@dfinity/authentication";
```

Note: depends on [@dfinity/agent](https://www.npmjs.com/package/@dfinity/agent) and
[@dfinity/identity](https://www.npmjs.com/package/@dfinity/identity).
