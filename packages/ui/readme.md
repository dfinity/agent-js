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

Supported attributes

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
