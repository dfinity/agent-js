# @dfinity/ui - a WebComponents library

This repository contains standardized web components you can drop into your Internet Computer frontend for convenience.

To install, run `npm install @dfinity/ui`

## IILoginButton

Implements a standardized login button for Internet Identity

```js
import { IILoginButton } from '@dfinity/ui';
```

in your application

```html
<ii-login-button></ii-login-button>
```

### Supported attributes

<table>
  <thead>
    <tr>
      <td>Attribute</td>
      <td>Use</td>
      <td>Default Value</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Label</td>
      <td>Allows you to customize text on the button</td>
      <td><code>"Login With Internet Identity"</code></td>
    </tr>
    <tr>
      <td>Logo-right</td>
      <td>Positions the logo on the right side of the button</td>
      <td><code>false</code></td>
    </tr>
  </tbody>
</table>

### Events

<table>
  <thead>
    <tr>
      <td>Event</td>
      <td>Purpose</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>ready</code></td>
      <td>Fires once the component has loaded</td>
    </tr>
    <tr>
      <td><code>login</code></td>
      <td>fires once the user has finished logging in</td>
    </tr>
  </tbody>
</table>

### Properties

<table>
  <thead>
    <tr>
      <td>Property</td>
      <td>Type</td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>authClient</code></td>
      <td><code>AuthClient</code></td>
    </tr>
    <tr>
      <td><code>isAuthenticated</code></td>
      <td><code>boolean</code></td>
    </tr>
    <tr>
      <td><code>identity</code></td>
      <td><code>Identity | undefined</code></td>
    </tr>
    <tr>
      <td><code>principal</code></td>
      <td><code>Principal | undefined</code></td>
    </tr>
    <tr>
      <td><code>principalString</code></td>
      <td><code>string | undefined</code></td>
    </tr>
    <tr>
      <td><code>accountId</code></td>
      <td><code>string | undefined</code></td>
    </tr>
  </tbody>
</table>
