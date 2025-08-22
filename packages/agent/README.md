# @icp-sdk/core/agent

JavaScript and TypeScript module to interact with the [Internet Computer](https://internetcomputer.org/) for Node.js and browser applications.

## Usage

```ts
import { HttpAgent } from '@icp-sdk/core/agent';

const agent = await HttpAgent.create({
  host: 'https://icp-api.io',
});

agent.call(..) // Send an update call to the canister
agent.query(..) // Send a query call to the canister
agent.readState(..) // Read the state of the canister
```

### Using an Agent

The agent is a low-level interface that the Actor uses to encode and decode messages to the Internet Computer. It provides `call`, `query` and `readState` methods to the Actor, as well as a few additional utilities. For the most part, calls through the agent are intended to be structured through an Actor, configured with a canister interface that can be automatically generated from a [Candid](https://github.com/dfinity/candid) interface.

### Initializing an Actor

The most common use for the agent is to create an actor. This is done by calling the `Actor.createActor` constructor:

```ts
Actor.createActor(interfaceFactory: InterfaceFactory, configuration: ActorConfig): ActorSubclass<T>
```

The `interfaceFactory` is a function that returns a runtime interface that the Actor uses to strucure calls to a canister. The interfaceFactory can be written manually, but it is recommended to use the `dfx generate` command to generate the interface for your project, or to use the `didc` tool to generate the interface for your project.

Actors can also be initialized to include the boundary node http headers, This is done by calling the `Actor.createActor` constructor:

```ts
Actor.createActorWithHttpDetails(interfaceFactory: InterfaceFactory, configuration: ActorConfig): ActorSubclass<ActorMethodMappedWithHttpDetails<T>>
```

### Inspecting an actor's agent

Use the `Actor.agentOf` method to get the agent of an actor:

```ts
const defaultAgent = Actor.agentOf(defaultActor);
```

This is useful if you need to replace or invalidate the identity used by an actor's agent.

For example, if you want to replace the identity of an actor's agent with a newly authenticated identity from [Internet Identity](https://identity.internetcomputer.org), you can do so by calling the `Actor.replaceAgent` method:

```ts
defaultAgent.replaceIdentity(await authClient.getIdentity());
```

### Tips for using fetch

The agent uses the browser `fetch` API to make calls to the Internet Computer. If you are not using the agent in the browser, you can pass a custom `fetch` implementation to the agent's constructor. This is useful if you want to use a custom fetch implementation, such as one that adds authentication headers to the request. We recommend using the [isomorphic-fetch](https://www.npmjs.com/package/isomorphic-fetch) package to provide a consistent fetch API across Node.js and the browser. You will also need to provide a `host` option to the agent's constructor, as the agent will not be able to determine the host from the global context.

For example,

```ts
import fetch from 'isomorphic-fetch';
import { HttpAgent } from '@icp-sdk/core/agent';

const host = process.env.DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://icp-api.io';

const agent = new HttpAgent({ fetch, host });
```

You can also pass `fetchOptions` to the agent's constructor, which will be passed to the `fetch` implementation. This is useful if you want to pass additional options to the `fetch` implementation, such as a custom header.

For example,

```ts
import fetch from 'isomorphic-fetch';
import { HttpAgent } from '@icp-sdk/core/agent';

const host = process.env.DFX_NETWORK === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app';

/**
 * @type {RequestInit}
 */
const fetchOptions = {
  headers: {
    'X-Custom-Header': 'value',
  },
};

const agent = new HttpAgent({ fetch, host, fetchOptions });
```

## API Reference

Additional API Documentation can be found [here](https://js.icp.build/core/latest/libs/agent/api).
