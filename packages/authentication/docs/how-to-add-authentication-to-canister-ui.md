# How to Add Authentication to a Canister User Interface

We'll start from a fresh project.

1. Create a new `dfx` project
    ```
    dfx new authentication_docs_demo
    cd authentication_docs_demo
    ```
1. Install `@dfinity/authentication` npm package
    ```
    npm install @dfinity/authentication@0.0.0-pre.identity-provider.9
    ```
2. `import { authenticator } from "@dfinity/authentication";`
3. To request that the end-user authenticate, call `authenticator.sendAuthenticationRequest({ scope: [] })`
    ```javascript
    if (confirm('Do you want to Authenticate?')) {
        authenticator.sendAuthenticationRequest({scope:[]})
    }
    ```
4. After the authentication, the end-user will be redirected back to your page with an `access_token` in the URL query string. Call `authenticator.receiveAuthenticationResponse()` to (try to) process it.
    ```javascript
    const url = new URL(document.location.href);
    const isMaybeAuthenticationRedirect = (params) => params.has('access_token');
    if (isMaybeAuthenticationRedirect(url.searchParams)) {
        authenticator.receiveAuthenticationResponse(url)
    }
    ```
5. If your DOM element needs to know about authenticated identities:
    ```javascript
    import { IdentityRequestedEvent } from "@dfinity/authentication"
    document.body.dispatchEvent(IdentityRequestedEvent({
        bubbles: true,
        compose: true, // use this inside shadow roots
        onIdentity: (identity) => {
            console.log('new @dfinity/authentication identity', identity);
        },
    }))
    ```

## Example Apps

* [ic-id-aware Custom Elements](https://github.com/dfinity/agent-js/tree/identity-provider/2021-01-04/packages/authentication-demo)
* outside of monorepo
    * https://github.com/gobengo/ic-whoami/
        * https://unyqz-hiaaa-aaaab-aacea-cai.ic0.app
