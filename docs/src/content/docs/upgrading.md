---
title: Upgrading to @icp-sdk/core
description: Upgrading guide for the new @icp-sdk/core package
next:
  label: Overview
  link: /core/latest/
---

The new `@icp-sdk/core` package is made up of multiple submodules, each of which contains the functionality of the respective old `@dfinity/...` package.

## Automatic

We provide a CLI tool to automatically upgrade your code to use the new package.

Simply run the following command in the root of your project:

```bash
npx @icp-sdk/migrate@latest
```

For more migration options, run `npx @icp-sdk/migrate@latest --help`.

## Manual

### From `@dfinity/agent`

Everything that was previously exported from `@dfinity/agent` is now exported from the `@icp-sdk/core/agent` submodule.

Follow these steps to upgrade:

1. Remove the `@dfinity/agent` dependency from your project:

   ```bash
   npm remove @dfinity/agent
   ```

2. Add the `@icp-sdk/core` dependency to your project:

   ```bash
   npm i @icp-sdk/core
   ```

3. Replace all the `@dfinity/agent` imports with `@icp-sdk/core/agent` in your code. For example:
   ```ts
   - import { HttpAgent } from '@dfinity/agent';
   + import { HttpAgent } from '@icp-sdk/core/agent';
   ```

### From `@dfinity/candid`

Everything that was previously exported from `@dfinity/candid` is now exported from the `@icp-sdk/core/candid` submodule.

Follow these steps to upgrade:

1. Remove the `@dfinity/candid` dependency from your project:

   ```bash
   npm remove @dfinity/candid
   ```

2. Add the `@icp-sdk/core` dependency to your project:

   ```bash
   npm i @icp-sdk/core
   ```

3. Replace all the `@dfinity/candid` imports with `@icp-sdk/core/candid` in your code. For example:
   ```ts
   - import { IDL } from '@dfinity/candid';
   + import { IDL } from '@icp-sdk/core/candid';
   ```

### From `@dfinity/identity`

Everything that was previously exported from `@dfinity/identity` is now exported from the `@icp-sdk/core/identity` submodule.

Follow these steps to upgrade:

1. Remove the `@dfinity/identity` dependency from your project:

   ```bash
   npm remove @dfinity/identity
   ```

2. Add the `@icp-sdk/core` dependency to your project:

   ```bash
   npm i @icp-sdk/core
   ```

3. Replace all the `@dfinity/identity` imports with `@icp-sdk/core/identity` in your code. For example:
   ```ts
   - import { Ed25519Identity } from '@dfinity/identity';
   + import { Ed25519Identity } from '@icp-sdk/core/identity';
   ```

### From `@dfinity/identity-secp256k1`

Everything that was previously exported from `@dfinity/identity-secp256k1` is now exported from the `@icp-sdk/core/identity-secp256k1` submodule.

Follow these steps to upgrade:

1. Remove the `@dfinity/identity-secp256k1` dependency from your project:

   ```bash
   npm remove @dfinity/identity-secp256k1
   ```

2. Add the `@icp-sdk/core` dependency to your project:

   ```bash
   npm i @icp-sdk/core
   ```

3. Replace all the `@dfinity/identity-secp256k1` imports with `@icp-sdk/core/identity-secp256k1` in your code. For example:
   ```ts
   - import { Secp256k1Identity } from '@dfinity/identity-secp256k1';
   + import { Secp256k1Identity } from '@icp-sdk/core/identity-secp256k1';
   ```

### From `@dfinity/principal`

Everything that was previously exported from `@dfinity/principal` is now exported from the `@icp-sdk/core/principal` submodule.

Follow these steps to upgrade:

1. Remove the `@dfinity/principal` dependency from your project:

   ```bash
   npm remove @dfinity/principal
   ```

2. Add the `@icp-sdk/core` dependency to your project:

   ```bash
   npm i @icp-sdk/core
   ```

3. Replace all the `@dfinity/principal` imports with `@icp-sdk/core/principal` in your code. For example:
   ```ts
   - import { Principal } from '@dfinity/principal';
   + import { Principal } from '@icp-sdk/core/principal';
   ```

## FAQ

### Workspaces

If you're using a workspace, you must run the migration tool for each package in the workspace that has any `@dfinity/*` dependencies.

A similar approach can be used for monorepos.

### Tree-shaking

Tree-shaking is supported, so you can import only the submodules you need and your bundler will automatically remove the unused code.
