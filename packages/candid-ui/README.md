## Candid UI

This package provides a web component that can generate an interactive UI for a provided canister. It can be used to interact with canisters that have a Candid interface.

### Usage

The web component is called `candid-ui`. In its basic usage, it takes a `canisterId` attribute, which is the canister ID of the canister to interact with. If no `canisterId` is provided, it will render a text input to allow the user to enter a canister ID. The component will also automatically infer a `host` from the current URL, either selecting a commonly used localhost port if present or mainnet, but this can be overridden by providing a `host` attribute.

### Installation

To use the component, you can either install it from npm:

```bash
npm install @dfinity/candid-ui
```

However, the package is optimized to be used in a script tag, so we recommend using the auto setup script from unpkg:

```html
<script type="module" src="https://unpkg.com/@dfinity/candid-ui/dist/auto.js"></script>
<candid-ui canisterId="rrkah-fqaaa-aaaaa-aaaaq-cai"></candid-ui>
```

or like this:

```html
<script type="module">
  import('https://unpkg.com/@dfinity/candid-ui/dist/auto.js');
</script>
```

Otherwise, you can manually initialize the component:

```html
<script type="module">
  import('@dfinity/candid-ui').then(({ defineElement }) => {
    defineElement();
  });
</script>
<candid-ui canisterId="rrkah-fqaaa-aaaaa-aaaaq-cai"></candid-ui>
```

or in a script:

```js
import { defineElement } from '@dfinity/candid-ui';
defineElement();
```

---

You can add an event listener to the component to be notified when the component has been initialized:

```html
<script type="module">
  import('@dfinity/candid-ui').then(({ defineElement }) => {
    defineElement();
  });
</script>
<candid-ui></candid-ui>
<script>
  const candidUi = document.querySelector('candid-ui');
  candidUi.addEventListener('ready', () => {
    candidUi.canisterId = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
  });
</script>
```

### Styling

The form comes with a default style, but you can override it by providing your own CSS. Add a `style` element to with a `slot` attribute set to `style`:

```html
<style slot="styles">
  h1 {
    color: red;
  }
</style>
```

### Adjusting Content

The component comes with a default `title` and `description` that can be overridden by setting attributes on the component:

```html
<candid-ui
  canisterId="rrkah-fqaaa-aaaaa-aaaaq-cai"
  title="My Canister"
  description="This is my canister interface"
></candid-ui>
```

You can also provide custom title and description elements using slots:

```html
<candid-ui>
  <h1 slot="title">My Canister</h1>
  <p slot="description">This is my canister interface</p>
</candid-ui>
```

## Full Interface

The component has the following attributes. Each of these can be read or set as a property on the component:

---

### `canisterId`

The canister ID of the canister to interact with. If no `canisterId` is provided, it will render a text input to allow the user to enter a canister ID.

**Default:** `undefined`

**Type:** `string`

**Example:**

```js
candidUi.canisterId = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
```

```html
<candid-ui canisterId="rrkah-fqaaa-aaaaa-aaaaq-cai"></candid-ui>
```

---

### `host`

The host to use when connecting to the canister. If no `host` is provided, it will automatically infer a `host` from the current URL, either selecting a commonly used localhost port if present or mainnet.

**Default**: `undefined`

**Type:** `string`

**Example:**

```js
candidUi.host = 'http://localhost:8080';
```

```html
<candid-ui host="http://localhost:8080"></candid-ui>
```

---

### `agent`

The agent to use when connecting to the canister. If no `agent` is provided, it will automatically create an agent using the provided `host`. This can only be set using JavaScript.

**Default**: `AnonymousAgent`

**Type:** `Agent`

**Example:**

```js
candidUi.agent = new HttpAgent({ host: 'http://localhost:8080', identity: myIdentity });
```

---

### `identity`

The identity to use when connecting to the canister. If no `identity` is provided, it will automatically create an agent using the provided `host`. This can only be set using JavaScript.

**Default**: `undefined`

**Type:** `Identity`

**Example:**

```js
candidUi.identity = myIdentity;
```

---

### `title`

The title to display above the form. If no `title` is provided, it will use a default title.

**Default**: `"Candid UI"`

**Type:** `string`

**Example:**

```js
candidUi.title = 'My Canister';
```

```html
<candid-ui title="My Canister"></candid-ui>
```

---

### `description`

The description to display above the form. If no `description` is provided, it will use a default description.

**Default**: `"Browse and test your API with our visual web interface."`

**Type:** `string`

**Example:**

```js
candidUi.description = 'This is my canister interface';
```

```html
<candid-ui description="This is my canister interface"></candid-ui>
```

---

### `methods`

The methods to display in the form. If no `methods` are provided, it will automatically display all the methods from the canister. For the html attribute, you can provide a comma-separated string. Methods will be displayed in the order they are provided.

**Default**: `undefined`

**Type:** `Array<string>`

**Example:**

```js
candidUi.methods = ['greet', 'whoami'];
```

```html
<candid-ui methods="greet, whoami"></candid-ui>
```

---

### `logLevel`

The log level to use when logging messages. If no `logLevel` is provided, it will use the default log level.

**Default**: `"none"`

**Type:** `"none" | "debug"`

**Example:**

```js
candidUi.logLevel = 'debug';
```

```html
<candid-ui loglevel="debug"></candid-ui>
```

## Methods

Additionally, the component has the following methods:

`setCanisterId(canisterId: string)`

Sets the `canisterId` attribute and updates the form. This is equivalent to setting the `canisterId` property.

---

`setAgent(agent: Agent)`

Sets the `agent` attribute and updates the form. This is equivalent to setting the `agent` property.

---

`setIdentity(identity: Identity)`

Sets the `identity` attribute and updates the form. This is equivalent to setting the `identity` property.

---

`reset()`

Resets the form to its initial state.

---

## Events

The component dispatches the following events:

---

`ready`

Dispatched when the component has been initialized. This event is dispatched when the component is first rendered, and when the `canisterId` attribute is set.

---

`error`

Dispatched when an error occurs. The event will have a `detail` property with the error message.

---

`request`

Dispatched when the form is submitted. The event will have a `detail` property with the arguments for the method.

---

`response`

Dispatched when the form receives a response. The event will have a `detail` property with the response.

---

## Development

### Setup

```bash
git clone
cd candid-ui
npm install
```

### Running

```bash
npm start
```

### Building

```bash
npm run build
```
