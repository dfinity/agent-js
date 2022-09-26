# @dfinity/auth-client

> 0.10.5 Idle update - see changes [here](#0.10.5-idle-update)

Simple interface to get your web application authenticated with the Internet Identity Service

Visit the [Dfinity Forum](https://forum.dfinity.org/) and [SDK Documentation](https://sdk.dfinity.org/docs/index.html) for more information and support building on the Internet Computer.

Additional API Documentation can be found [here](https://agent-js.icp.xyz/auth-client/index.html).

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

<h2 id="0.10.5-idle-update">Idle Management</h2>

The AuthClient provides two forms of security for session management. The first is built into the Internet Identity delegation - the `maxTimeToLive` option in nanoseconds determines how long the `DelegationIdentity` you get back will be valid for. The second is the Idle Manager, which moniters keyboard, mouse and touchscreen identity. The Idle Manager will automatically log you out if you don't interact with the browser for a period of time.

If you pass no options to the IdleManager, it will log you out after 10 minutes of inactivity by removing the `DelegationIdentity` from localStorage and then calling `window.location.reload()`.

If you pass an `onIdle` option, it will call that function when the user is idle, replacing the default window.location.reload() behavior. You can also register callbacks after the idleManager is created with the `idleManager.registerCallback()` method, which will also replace the default callback.

The full set of options for the IdleManager is:

```js
  /**
   * Callback after the user has gone idle
   */
  onIdle?: IdleCB;
  /**
   * timeout in ms
   * @default 30 minutes [600_000]
   */
  idleTimeout?: number;
  /**
   * capture scroll events
   * @default false
   */
  captureScroll?: boolean;
  /**
   * scroll debounce time in ms
   * @default 100
   */
  scrollDebounce?: number;
```

Additionally, the AuthClient accepts a couple additional flags to `idleOptions` to control the IdleManager:

```js
  /**
   * Disables idle functionality for {@link IdleManager}
   * @default false
   */
  disableIdle?: boolean;

  /**
   * Disables default idle behavior - call logout & reload window
   * @default false
   */
  disableDefaultIdleCallback?: boolean;
```

### IdleManager Example Usage

```js
const authClient = await AuthClient.create({
  idleOptions: {
    idleTimeout: 1000 * 60 * 30, // set to 30 minutes
    disableDefaultIdleCallback: true // disable the default reload behavior
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
