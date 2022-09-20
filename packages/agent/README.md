# @dfinity/agent

JavaScript and TypeScript library to interact with the [Internet Computer](https://dfinity.org/) for Node.js and Client applications

Visit the [Dfinity Forum](https://forum.dfinity.org/) and [SDK Documentation](https://internetcomputer.org/docs/index.html) for more information and support building on the Internet Computer. For an introduction to the JavaScript / TypeScript agent, see [internetcomputer.org - JavaScript Intro](https://internetcomputer.org/docs/current/developer-docs/build/agents/javascript/javascript-intro).

Additional API Documentation can be found at [agent-js.icp.xyz](https://agent-js.icp.xyz/agent/index.html), and the changelog is available at [agent-js.icp.xyz/changelog.html](agent-js.icp.xyz/changelog.html) or alternately at [github releases](https://github.com/dfinity/agent-js/releases).

---

## Installation

Using agent:

```
npm i --save @dfinity/agent
```

### In the browser:

```
import * as agent from "@dfinity/agent";
```

or using individual exports:

```
import { Actor, HttpAgent } from "@dfinity/agent";
```

### In Node.js

```
const actor = require("@dfinity/agent");
```

Important Contents of this package:

- [Actor](https://agent-js.icp.xyz/agent/classes/Actor.html)
- [HttpAgent](https://agent-js.icp.xyz/agent/classes/HttpAgent.html)
- [Certificate](https://agent-js.icp.xyz/agent/classes/Certificate.html)
- [CanisterStatus](https://agent-js.icp.xyz/agent/modules/CanisterStatus.html)
- Utils
  - Buffer Utils
    - [compare](https://agent-js.icp.xyz/agent/modules.html#compare)
    - [concat](https://agent-js.icp.xyz/agent/modules.html#concat)
    - [fromHex](https://agent-js.icp.xyz/agent/modules.html#fromHex)
    - [hash](https://agent-js.icp.xyz/agent/modules.html#hash) - sha256 hash of an ArrayBuffer
    - [toHex](https://agent-js.icp.xyz/agent/modules.html#toHex)
  - IC Utils
    - [createAssetCanisterActor](https://agent-js.icp.xyz/agent/modules.html#createAssetCanisterActor)
    - [getDefaultAgent](https://agent-js.icp.xyz/agent/modules.html#getDefaultAgent)
    - [getManagementCanister](https://agent-js.icp.xyz/agent/modules.html#getManagementCanister)

## Using an Agent

The agent is a low-level interface that the Actor uses to encode and decode messages to the Internet Computer. It provides `call`, `query` and `readState` methods to the Actor, as well as a few additional utilities. For the most part, calls through the agent are intended to be structured through an Actor, configured with a canister interface that can be automatically generated from a [Candid](https://github.com/dfinity/candid) interface.

## Initializing an Actor

The most common use for the agent is to create an actor. This is done by calling the `Actor.createActor` constructor:

```
Actor.createActor(interfaceFactory: InterfaceFactory, configuration: ActorConfig): ActorSubclass<T>
```

The `interfaceFactory` is a function that returns a runtime interface that the Actor uses to strucure calls to a canister. The interfaceFactory can be written manually, but it is recommended to use the `dfx generate` command to generate the interface for your project, or to use the `didc` tool to generate the interface for your project.

### Inspecting an actor's agent

Use the `Actor.agentOf` method to get the agent of an actor:

```
const defaultAgent = Actor.agentOf(defaultActor);
```

This is useful if you need to replace or invalidate the identity used by an actor's agent.

For example, if you want to replace the identity of an actor's agent with a newly authenticated identity from [Internet Identity](https://identity.ic0.app), you can do so by calling the `Actor.replaceAgent` method:

```
defaultAgent.replaceIdentity(await authClient.getIdentity());
```
