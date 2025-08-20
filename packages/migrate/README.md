# @icp-sdk/core-migrate

CLI tool to automatically migrate your project from `agent-js` packages to `@icp-sdk/core`.

## What it does

This tool automatically performs the migration steps described in the [upgrading guide](https://js.icp.build/core/latest/upgrading):

1. **Removes old dependencies**: Automatically removes the following `agent-js` packages from your project:
   - `@dfinity/agent`
   - `@dfinity/candid`
   - `@dfinity/identity`
   - `@dfinity/identity-secp256k1`
   - `@dfinity/principal`
2. **Adds new dependency**: Installs `@icp-sdk/core` package
3. **Updates imports**: Finds and replaces all import statements in your source code to use the new `@icp-sdk/core` package.
   > Note: this tool only replaces the `@dfinity/*` imports. If you are using `@dfinity/*` packages somewhere else in your code, e.g. in tests mocks, you will need to find and replace the occurrences manually.

### Supported package managers

- npm
- yarn
- pnpm

## Usage

Run the migration tool in your project directory.

With `npm`:

```shell
npx @icp-sdk/core-migrate@latest
```

With `pnpm`:

```shell
pnpm dlx @icp-sdk/core-migrate@latest
```

For more options, run `npx @icp-sdk/core-migrate@latest --help`.
