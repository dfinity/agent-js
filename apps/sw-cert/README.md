# Certifying Service Worker
Certified fun guaranteed.

## Build
From the root of this repo, `npm ci && npm build --workspaces --if-present`. The output should be in a `dist/`
folder next to this file.

### Build With FETCH_ROOT_KEY
By setting the `FORCE_FETCH_ROOT_KEY` environment variable prior to building, the service worker will
always fetch the root key of the network before doing the validation.

**THIS SHOULD ONLY BE USED ON A TEST OR LOCAL NETWORK.** The IC mainnet public key is hard coded in
the agent and, for security reasons, should not be fetched by the agent.

## Develop
You will need to build the rest of the repo first (see Build section above) so that the agent packages are available when building this app.

Start a replica on the port 8080 (doesn't have to be `dfx start` or a proxy, can be a plain replica).

Start a watch mode webpack build with `npm run build -- --watch`.

To start the local development instance: `cd apps/sw-cert && npm start`. This will start serving the files built. Any path that don't match a file instead will be sent to localhost:8000. 

It's important to not use `webpack-dev-server` (even if it's available) as it is not fully compatible with Service Workers.
