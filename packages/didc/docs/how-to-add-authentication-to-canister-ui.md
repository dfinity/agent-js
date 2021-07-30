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
1. `import { authenticator } from "@dfinity/authentication";`
1. To request that the end-user authenticate, call `authenticator.sendAuthenticationRequest`
   ```javascript
   import { authenticator, Ed25519KeyIdentity } from '@dfinity/authentication';
   if (confirm('Do you want to Authenticate?')) {
     login();
   }
   function readSession(session) {
     const stored = localStorage.getItem('session');
     if (!stored) {
       return null;
     }
     try {
       const parsed = JSON.parse();
       return {
         ...parsed,
         identity: Ed25519KeyIdentity.fromJSON(parsed.identity),
       };
     } catch (error) {
       throw error;
     }
   }
   function writeSession(session) {
     localStorage.setItem('session', JSON.stringify(session));
   }
   function login() {
     const entropy = crypto.getRandomValues(new Uint8Array(32));
     const sessionIdentity = Ed25519KeyIdentity.generate(entropy);
     const session = {
       authenticationResponse: undefined,
       identity: sessionIdentity,
     };
     writeSession(session);
     authenticator.sendAuthenticationRequest({
       scope: [],
       session,
     });
   }
   ```
1. After the authentication, the end-user will be redirected back to your page with an `access_token` in the URL query string. Call `authenticator.useSession` to (try to) process it.

   ```javascript
   const session = readSession();
   if (session.authenticationResponse) {
     authenticator.useSession(session);
   } else {
     if (/access_token/.test(location.search)) {
       writeSession({
         ...session,
         authenticationResponse: location.toString(),
       });
       authenticator.useSession(readSession());
     }
   }
   ```

1. If your DOM element needs to know about authenticated identities:
   ```javascript
   import { IdentityRequestedEvent } from '@dfinity/authentication';
   document.body.dispatchEvent(
     IdentityRequestedEvent({
       bubbles: true,
       compose: true, // use this inside shadow roots
       onIdentity: identity => {
         console.log('new @dfinity/authentication identity', identity);
       },
     }),
   );
   ```

## Example Apps
