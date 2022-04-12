# @dfinity/auth-client

> 0.10.5 Idle update - see changes [here](#0.10.5-idle-update)

Simple interface to get your web application authenticated with the Internet Identity Service

Visit the [Dfinity Forum](https://forum.dfinity.org/) and [SDK Documentation](https://sdk.dfinity.org/docs/index.html) for more information and support building on the Internet Computer.

Additional API Documentation can be found [here](https://agent-js.icp.host/auth-client/index.html).

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
  // 7 days in nanoseconds
  maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
  onSuccess: async () => {
    handleAuthenticated(authClient);
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

<h2 id="0.10.5-idle-update">Idle Update</h2>

As of 0.10.5, the authClient has two notable new features:

1. the maxTimeToLive is now a set to 8 hours by default, down from 24.
2. you can now set a timeout for when your identity will be considered idle

These defaults are more conservative, out of the interest of protecting users as more sites are starting to manage ICP and NFT's. You can override these defaults, and opt out of the Idle Manager if you so choose. For more details, see the [forum discussion](https://forum.dfinity.org/t/authclient-update-idle-timeouts).

Additionally, we now support utility methods in Agents to invalidate an identity. It is suggested that you use this method to invalidate an identity once the user goes idle by calling `Actor.getAgent(actor).invalidateIdentity()`. See the below code for an example:

```js
const authClient = await AuthClient.create({
  idleOptions: {
    idleTimeout: 1000 * 60 * 30, // set to 30 minutes
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
  // prompt the user then refresh their authentication
  authClient.login({
    onSuccess: async () => {
      const newIdentity = await AuthClient.getIdentity();
      Actor.getAgent(actor).replaceIdentity(newIdentity);
    }
  });
}

authClient.idleManager?.registerCallback?.(refreshLogin);
```

In this code, we create an `authClient` with an idle timeout of 30 minutes. When the user is idle, we invalidate their identity and prompt them to login again.

After the user logs in, we can set the new identity in the actor without reloading the page.

Note: depends on [@dfinity/agent](https://www.npmjs.com/package/@dfinity/agent), [@dfinity/authentication](https://www.npmjs.com/package/@dfinity/authentication), and
[@dfinity/identity](https://www.npmjs.com/package/@dfinity/identity).
