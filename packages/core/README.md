# @icp-sdk/core

The `@icp-sdk/core` package is a JavaScript and TypeScript library designed to interact with the Internet Computer. It acts as a meta-package that re-exports functionality from several other `@dfinity` packages, providing a convenient way to access multiple tools and utilities in one place.

**Note:** This package requires the `node16` (or later) module resolution strategy to function correctly.

## Installation

You can install the `@icp-sdk/core` package using your preferred package manager:

### npm

```shell
npm install @icp-sdk/core
```

### yarn

```shell
yarn add @icp-sdk/core
```

### pnpm

```shell
pnpm add @icp-sdk/core
```

## Package Structure

The `@icp-sdk/core` package re-exports modules from the following `@dfinity` packages:

- [`@dfinity/agent`](../agent/README.md): Provides tools to interact with the Internet Computer, including creating actors and making calls.
- [`@dfinity/auth-client`](../auth-client/README.md): Handles authentication flows, including integration with Internet Identity.
- [`@dfinity/candid`](../candid/README.md): Tools for working with Candid, the Internet Computer's interface definition language.
- [`@dfinity/identity`](../identity/README.md): Identity management for signing and authentication.
- [`@dfinity/identity-secp256k1`](../identity-secp256k1/README.md): Identity management using secp256k1 cryptography.
- [`@dfinity/principal`](../principal/README.md): Utilities for working with principals on the Internet Computer.

## Import Paths

The package provides the following import paths for accessing the re-exported modules:

- `@icp-sdk/core/agent`
- `@icp-sdk/core/auth-client`
- `@icp-sdk/core/candid`
- `@icp-sdk/core/identity`
- `@icp-sdk/core/identity-secp256k1`
- `@icp-sdk/core/principal`

## Usage Example

Here is an example of how to use the `@icp-sdk/core` package:

```ts
// Importing the HttpAgent from the agent module
import { HttpAgent } from '@icp-sdk/core/agent';

// Importing the Principal utility
import { Principal } from '@icp-sdk/core/principal';

// Create an HttpAgent instance
const agent = new HttpAgent({ host: 'https://ic0.app' });

// Create a Principal from a string
const principal = Principal.fromText('aaaaa-aa');

// Log the Principal
console.log(principal.toText());
```

For detailed usage and API documentation, refer to the respective documentation of the re-exported packages:

- [@dfinity/agent Documentation](../agent/README.md)
- [@dfinity/auth-client Documentation](../auth-client/README.md)
- [@dfinity/candid Documentation](../candid/README.md)
- [@dfinity/identity Documentation](../identity/README.md)
- [@dfinity/identity-secp256k1 Documentation](../identity-secp256k1/README.md)
- [@dfinity/principal Documentation](../principal/README.md)

## Contributing

Contributions are welcome! Please refer to the [repository](https://github.com/dfinity/agent-js) for guidelines on contributing to this project.

## License

This project is licensed under the Apache-2.0 License. See the [LICENSE](https://github.com/dfinity/agent-js/blob/main/LICENSE) file for details.
