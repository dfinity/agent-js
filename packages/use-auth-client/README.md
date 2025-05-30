# @dfinity/use-auth-client

`@dfinity/use-auth-client`! This is a package for Internet Computer React developers, making it easier to integrate the auth-client with your React application. 

You can use it to manage your identity for you, or you can pass it an `idlFactory` and `canisterId` and it will construct and manage your entire `Actor` for you. 

To install, use 
```
npm install @dfinity/use-auth-client
```

and you can import and set it up like so:

```
import {useAuthClient} from '@dfinity/use-auth-client';

...ts
const App = () => {
  const identityProvider =
    // eslint-disable-next-line no-undef
    process.env.DFX_NETWORK === 'local'
      ? // eslint-disable-next-line no-undef
        `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`
      : 'https://identity.internetcomputer.org';

  const { isAuthenticated, login, logout, actor } = useAuthClient({
    loginOptions: {
      identityProvider,
    },
    actorOptions: {
      canisterId,
      idlFactory,
    },
  });
  ...
}
```

## Multiple Actors

If you have multiple actors, you can pass a record of `actorOptions` to the `useAuthClient` hook. The keys of the record will be the names of the actors, and the values will be the `actorOptions` for that actor. It will look something like this: 

```ts
const { isAuthenticated, login, logout, actors } = useAuthClient({
  actors: {
    actor1: {
      canisterId: canisterId1,
      idlFactory: idlFactory1,
    },
    actor2: {
      canisterId: canisterId2,
      idlFactory: idlFactory2,
    },
  },
});

const { actor1, actor2 } = actors;

```

There is a live demo at https://5ibdo-haaaa-aaaab-qajia-cai.icp0.io/ 

Additional generated documentaion is available at https://agent-js.icp.xyz/use-auth-client/index.html
