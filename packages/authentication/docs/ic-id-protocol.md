# Internet Computer Identity Protocol

aka ic-id-protocol

## Abstract

ic-id-protocol describes how Internet Computer Canisters can interact with an Identity Provider implementing this protocol in order to enable authentication, sessions, and thence personalization of the Internet Computer Canisters they develop and publish to the Internet Computers for end-users to make use of.

This protocol is not novel and strives to be a conventional example of a system using the [The OAuth 2.0 Authorization Framework][1] (i.e. 'OAuth2'). This is to maximize compatability with existing developer knowledge and tools. Where OAuth2 is not sufficiently perscriptive to drive implementation (it's a framework, not a protocol), we will prefer to leverage existing terms defined in [OpenID Connect Core 1.0][2] instead of defining new duplicative terms.

## Introduction

The ic-id-protocol can be used by a software component to:
* request that the end-user provide your app with proof of ownership over a cryptographic keyPair
* request an AuthenticationResponse whose contents can be used to make Internet Computer Protocol requests with [Authentication](https://sdk.dfinity.org/docs/interface-spec/#authentication), including requesting an access token that only has the capability of interacting with an enuemrated set of Canisters.

System components communicate in this protocol by passing messages via HTTP. System components and the end-user communicate using a web user-agent's HTTP requests and responses.


### Terms

* <dfn>Relying Party</dfn> (aka 'RP'): see https://en.wikipedia.org/wiki/Relying_party

* <dfn>Identity Provider</dfn> (aka 'IDP'): see https://en.wikipedia.org/wiki/Identity_provider

* <dfn>Session</dfn>: <blockquote>Continuous period of time during which an End-User accesses a Relying Party relying on the Authentication of the End-User performed by the OpenID Provider. </blockquote>--<cite>https://openid.net/specs/openid-connect-session-1_0.html#Terminology</cite>

* <dfn>Session KeyPair</dfn>: keyPair that identifies a Session

[1]: https://tools.ietf.org/html/rfc6749
[2]: https://openid.net/specs/openid-connect-core-1_0.html

### Summary

At a high level, this is how an RP requests end-user Authentication using ic-id-protocol.

* Assumption: end-user is visiting an RP for the first time
* A Relying Party (aka 'RP') (e.g. an IC Canister) creates a new ed25519 keyPair to identify an authentication Session of end-user interaction with the RP, and stores this Session KeyPair somewhere durable.
* RP builds AuthenticationRequest whose `login_hint` corresponds to the Session KeyPair Public Key
* RP sends AuthenticationRequest to IDP via end-user's web user-agent
* end-user Authenticates with RP, consents to delegate limitd authority to the Session
* IDP sends AuthenticationResponse to RP via end-user's web user-agent
* RP receives AuthenticationResponse access_token, decodes it, and combines the contents with the Session KeyPair *Private* Key in order to make signed, [Authenticated](https://sdk.dfinity.org/docs/interface-spec/#authentication) Internet Computer requests.

See below "Relation to OAuth2" for a sequence diagram that corresponds to this story.

## Authentication

### Relation to OAuth2

The overall authentication process is most similar to the OAuth2 Implicit Grant Flow.

>  The implicit grant is a simplified authorization code flow optimized
   for clients implemented in a browser using a scripting language such
   as JavaScript.  In the implicit flow, instead of issuing the client
   an authorization code, the client is issued an access token directly
   (as the result of the resource owner authorization).  The grant type
   is implicit, as no intermediate credentials (such as an authorization
   code) are issued (and later used to obtain an access token).
>
> -- <cite>https://tools.ietf.org/html/rfc6749#section-1.3.2</cite>

From [OAuth2#4.2 Implicit Grant](https://tools.ietf.org/html/rfc6749#section-4.2):
```
The implicit grant type is used to obtain access tokens (it does not
support the issuance of refresh tokens) and is optimized for public
clients known to operate a particular redirection URI.  These clients
are typically implemented in a browser using a scripting language
such as JavaScript.

Since this is a redirection-based flow, the client must be capable of
interacting with the resource owner's user-agent (typically a web
browser) and capable of receiving incoming requests (via redirection)
from the authorization server.

Unlike the authorization code grant type, in which the client makes
separate requests for authorization and for an access token, the
client receives the access token as the result of the authorization
request.

The implicit grant type does not include client authentication, and
relies on the presence of the resource owner and the registration of
the redirection URI.  Because the access token is encoded into the
redirection URI, it may be exposed to the resource owner and other
applications residing on the same device.

     +----------+
     | Resource |
     |  Owner   |
     |          |
     +----------+
          ^
          |
         (B)
     +----|-----+          Client Identifier     +---------------+
     |         -+----(A)-- & Redirection URI --->|               |
     |  User-   |                                | Authorization |
     |  Agent  -|----(B)-- User authenticates -->|     Server    |
     |          |                                |               |
     |          |<---(C)--- Redirection URI ----<|               |
     |          |          with Access Token     +---------------+
     |          |            in Fragment
     |          |                                +---------------+
     |          |----(D)--- Redirection URI ---->|   Web-Hosted  |
     |          |          without Fragment      |     Client    |
     |          |                                |    Resource   |
     |     (F)  |<---(E)------- Script ---------<|               |
     |          |                                +---------------+
     +-|--------+
       |    |
      (A)  (G) Access Token
       |    |
       ^    v
     +---------+
     |         |
     |  Client |
     |         |
     +---------+

   Note: The lines illustrating steps (A) and (B) are broken into two
   parts as they pass through the user-agent.

                       Figure 4: Implicit Grant Flow

   The flow illustrated in Figure 4 includes the following steps:

   (A)  The client initiates the flow by directing the resource owner's
        user-agent to the authorization endpoint.  The client includes
        its client identifier, requested scope, local state, and a
        redirection URI to which the authorization server will send the
        user-agent back once access is granted (or denied).

   (B)  The authorization server authenticates the resource owner (via
        the user-agent) and establishes whether the resource owner
        grants or denies the client's access request.

   (C)  Assuming the resource owner grants access, the authorization
        server redirects the user-agent back to the client using the
        redirection URI provided earlier.  The redirection URI includes
        the access token in the URI fragment.

   (D)  The user-agent follows the redirection instructions by making a
        request to the web-hosted client resource (which does not
        include the fragment per [RFC2616]).  The user-agent retains the
        fragment information locally.

   (E)  The web-hosted client resource returns a web page (typically an
        HTML document with an embedded script) capable of accessing the
        full redirection URI including the fragment retained by the
        user-agent, and extracting the access token (and other
        parameters) contained in the fragment.

   (F)  The user-agent executes the script provided by the web-hosted
        client resource locally, which extracts the access token.

   (G)  The user-agent passes the access token to the client.

   See Sections 1.3.2 and 9 for background on using the implicit grant.
   See Sections 10.3 and 10.16 for important security considerations
   when using the implicit grant.
```

## Messages

### AuthenticationRequest

Similar to:
* https://tools.ietf.org/html/rfc6749#section-4.2.1

Differences from the above:
* `redirect_uri` is required
* `scope` is required, and includes extra documentation about the interpretation of this space-delimited-string parameter for requesting authorization for scoped capabilities to specific Internet Computer Canisters on behalf of the end-user (access tokens authorized to interact with all canisters are not supported yet to maximize end-user safety)

Prefer terms defined here before defining new ones:
* https://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthRequest

<table>
    <thead>
        <tr>
            <th scope="col">Namespace</th>
            <th scope="col">Name</th>
            <th scope="col">Required</th>
            <th scope="col">Definition</th>
            <th scope="col">Examples</th>
        </tr>
    </thead>
    <tr>
        <td><a href="https://tools.ietf.org/html/rfc6749#section-4.2.1">OAuth2</a></td>
        <td>response_type</td>
        <td>&#x2611;</td>
        <td>Value must be set to "token"</td>
        <td><pre>token</pre></td>
    </tr>
    <tr>
        <td><a href="https://tools.ietf.org/html/rfc6749#section-4.2.1">OAuth2</a></td>
        <td>client_id</td>
        <td>&#x2611;</td>
        <td>
            Unique identifier of the RP requesting authentication. If the RP is an internet computer canister, use a unique identifier like <code>https://{canister}.ic0.app</code>
        </td>
        <td><pre>https://agujh-y3paa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-q.ic0.app/</pre></td>
    </tr>
    <tr>
        <td><a href="https://tools.ietf.org/html/rfc6749#section-4.2.1">OAuth2</a></td>
        <td>redirect_uri</td>
        <td>&#x2611;</td>
        <td>
            <p>URI that the IDP should send the AuthenticationResponse to. See <a href="https://tools.ietf.org/html/rfc6749#section-3.1.2">OAuth2#3.1.2 Redirection Endpoint</a></p>
            <p>
                If the RP is an Internet Computer Canister, you can just use the Canister URL. You can set the redirect_uri path component (e.g. `/` or `/.well-known/ic-id-protocol/redirect_uri`) to anything you want, as long as your canister handles the response.
            </p>
        </td>
        <td><pre>https://agujh-y3paa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-q.ic0.app/.well-known/ic-id-protocol/redirect_uri</pre></td>
    </tr>
    <tr>
        <td><a href="https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest">OIDC</a></td>
        <td>login_hint</td>
        <td>&#x2611;</td>
        <td>
            Public Key of a Session KeyPair controlled by the RP. This Public Key will be <a href="">delegated to</a> for a limited period of time, and with authorization to control only an enumerated set of canisters. The resulting delegation will be encoded in the AuthenticationResponse's access_token.
        </td>
        <td></td>
    </tr>
    <tr>
        <td><a href="https://tools.ietf.org/html/rfc6749#section-4.2.1">OAuth2</a></td>
        <td>state</td>
        <td></td>
        <td>
            <div>
                <p>
                    <blockquote>An opaque value used by the client to maintain
                    state between the request and callback.  The authorization
                    server includes this value when redirecting the user-agent back
                    to the client.  The parameter SHOULD be used for preventing
                    cross-site request forgery as described in <cite><a href="https://tools.ietf.org/html/rfc6749#section-10.12">Section 10.12 [of OAuth2]</a></cite>.</blockquote>
                </p>
                <p>
                    One additional common use case for <code>state</code> is to encode the intended destination of the end-user within the RP. This can be used by the RP when handling the AuthenticationResponse. After otherwise fully receiving the AuthenticationResponse, the RP can parse the intended destination out of the echoed <code>state</code>, then redirect the user to their destination with an authentication session. This pattern is described <a href="https://auth0.com/docs/protocols/state-parameters">here</a>.
                </p>
            </div>
        </td>
        <td>
            <ul>
                <li><pre>destination=/rp-destination-path</pre></li>
                <li><pre>gibberish-opqaue-string</pre></li>
            </ul>
        </td>
    </tr>
</table>

### AuthenticationResponseSuccess

Similar to:
* https://tools.ietf.org/html/rfc6749#section-4.2.2

Differences from the above:
* none so far

Prefer terms defined here before defining new ones:
* https://openid.net/specs/openid-connect-core-1_0.html#ImplicitAuthResponse

<table>
    <thead>
        <tr>
            <th scope="col">Namespace</th>
            <th scope="col">Name</th>
            <th scope="col">Required</th>
            <th scope="col">Definition</th>
            <th scope="col">Examples</th>
        </tr>
    </thead>
    <tr>
        <td><a href="https://tools.ietf.org/html/rfc6749#section-4.2.2">OAuth2</a></td>
        <td>access_token</td>
        <td>&#x2611;</td>
        <td>The access token issued by the authorization server.</td>
        <td></td>
    </tr>
    <tr>
        <td><a href="https://tools.ietf.org/html/rfc6749#section-4.2.2">OAuth2</a></td>
        <td>token_type</td>
        <td>&#x2611;</td>
        <td>This will be the string "Bearer"</td>
        <td>Bearer</td>
    </tr>
    <tr>
        <td><a href="https://tools.ietf.org/html/rfc6749#section-4.2.2">OAuth2</a></td>
        <td>expires_in</td>
        <td></td>
        <td>
            <blockquote>
            The lifetime in seconds of the access token.  For
            example, the value "3600" denotes that the access token will
            expire in one hour from the time the response was generated.
            If omitted, the authorization server SHOULD provide the
            expiration time via other means or document the default value.
            </blockquote>
            --<cite><a href="https://tools.ietf.org/html/rfc6749#section-4.2.2">OAuth2</a></cite>
        </td>
    </tr>
    <tr>
        <td><a href="https://tools.ietf.org/html/rfc6749#section-4.2.2">OAuth2</a></td>
        <td>state</td>
        <td></td>
        <td>
            REQUIRED if the "state" parameter was present in the client
            authorization request.  The exact value received from the
            client.
        </td>
        <td></td>
    </tr>
</table>

### AuthenticationResponseError

See [OAuth2#4.2.2.1 Error Response](https://tools.ietf.org/html/rfc6749#section-4.2.2.1) for the parameters of the AuthenticationErrorResponse.

#### Error Kinds

Errors that are idiosyncratic to the ic-id-protocol will have distinct `error_uri` parameter values.

The following table is a registry of these errors:

<table>
    <thead>
        <tr>
            <th scope="col">error_uri</th>
            <th scope="col">error_description example</th>
        </tr>
    </thead>
</table>

(the table is empty)

## Known Implementations

Identity Provider
* @dfinity/identity-provider
    * test environment (no SLA): https://identity-provider.sdk-test.dfinity.network/ - not yet fully compliant, but soon will be
    * source: https://github.com/dfinity/agent-js/tree/identity-provider/2021-01-04/packages/identity-provider

Relying Party
* @dfinity/identity-provider-rp-demo
    * test environment (no SLA): https://identity-provider.sdk-test.dfinity.network/relying-party-demo
    * source: https://github.com/dfinity/agent-js/tree/identity-provider/2021-01-04/packages/identity-provider/src/relying-party-demo
* webauthn_tester:
    * test environment (no SLA): https://pbh67-jaaaa-aaaab-aaavq-cai.ic0.app/
    * source: https://github.com/dfinity/webauthn_tester
* ic-whoami:
    * source: https://github.com/gobengo/ic-whoami

Other Tools
* none yet

## Acknowledgements

* https://dfinity.org
* https://cseweb.ucsd.edu/~btackmann/ - Researcher for broader Internet Computer Authentication architecture, of which this is a small enabling protocol. Thanks for your patience, education, hard work, and for meeting at odd hours so many times due to time zone differences.

