# @dfinity/auth-client

Simple interface to get your web application authenticated with the Internet Identity Service

Visit the [Dfinity Forum](https://forum.dfinity.org/) and [SDK Documentation](https://sdk.dfinity.org/docs/index.html) for more information and support building on the Internet Computer.

Additional API Documentation can be found [here](https://peacock.dev/auth-client-docs).

---

## Installation

Using AuthClient:

```
npm i --save @dfinity/auth-client
```

### In the browser:

```
import { AuthClient } from "@dfinity/auth-client";
```

To get started with auth client, run

```js
const authClient = await AuthClient.create();
```

The authClient can log in with

```js
authClient.login({
  onSuccess: async () => {
    // authClient now has an identity
  },
});
```

It opens an `identity.ic0.app` window, saves your delegation to localStorage, and then sets you up with an identity.

Then, you can use that identity to make authenticated calls using the `@dfinity/agent` `Actor`.

```js
const identity = await authClient.getIdentity();
const actor = Actor.createActor(idlFactory, {
  agent: new HttpAgent({
    identity,
  }),
  canisterId,
});
```

## Idle Timeout

As of 0.10.5, you can now set a timeout for when your identity will be considered idle, and you can use that to log out or prompt your user to refresh their authentication. This is recommended for applications managing tokens or other valuable information.

```js
const authClient = await AuthClient.create({
  idleOptions: {
    idleTimeout: 1000 * 60 * 30, // default is 30 minutes
    onIdle: () => {
      // invalidate identity in your actor
      Actor.agentOf(actor).invalidateIdentity()
      // prompt user to refresh their authentication
      refreshLogin();
    },
    disableIdle: false, // set to true to disable idle timeout
  }
});
// ...authClient.login()
const identity = await authClient.getIdentity();
const actor = Actor.createActor(idlFactory, {
  agent: new HttpAgent({
    identity,
  }),
  canisterId,
});

refreshLogin() {
  // prompt the user before refreshing their authentication
  authClient.login({
    onSuccess: async () => {
      // authClient now has an identity
      const identity = await authClient.getIdentity();
      // set new identity in your actor without reloading the page
      Actor.agentOf(actor).replaceIdentity(identity);
    },
  });
}
```

In this code, we create an `authClient` with an idle timeout of 30 minutes. When the user is idle, we invalidate their identity and prompt them to login again.

After the user logs in, we can set the new identity in the actor without reloading the page.

Note: depends on [@dfinity/agent](https://www.npmjs.com/package/@dfinity/agent), [@dfinity/authentication](https://www.npmjs.com/package/@dfinity/authentication), and
[@dfinity/identity](https://www.npmjs.com/package/@dfinity/identity).
