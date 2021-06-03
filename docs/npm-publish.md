# Publishing `@dfinity/agent` to registry.npmjs.org

The goal of this document is to serve as instructions for releasing a given git checkout of this repository to registry.npmjs.org.

It should be

- accurate/functional
- not too long or hard to manage
- as approachable as possible, so anyone can follow the instructions

## Prerequisites

- [`npm`](https://www.npmjs.com/get-npm) installed and available in your shell:
  - test:
    ```
    command -v npm && echo 'npm found' || echo 'ERROR: npm missing
    ```

## Instructions

1. Clone the agent-js-monorepo

   ```
   pushd `mktemp -d`
   git clone git@github.com:dfinity-lab/agent-js.git agent-js-monorepo
   cd agent-js-monorepo
   ```

2. npm install (via `npm ci`) the monorepo root package

   ```
   npm ci
   ```

   - If you're reusing an long-lasting checkout of this repository, you skipped an earlier step. If you insist, you probably want to run `git clean -dfx .` here.

3. Change directories into the `@dfinity/agent` package (the monorepo contains several npm packages)

   ```
   cd packages/agent
   ```

4. Set the version number. If you're releasing `@dfinity/agent` alongside `dfx` and the sdk, you should use the same version number for both.

   ```
   # For testing, use something like:
   new_agent_js_version_number='0.0.0-dev.0'

   # When releasing alongside `dfx`/sdk, you should use (without leading '#'):
   # new_agent_js_version=$NEW_DFX_VERSION

   npm version $new_agent_js_version
   ```

5. Publish to npm registry:

   ```
   # If you haven't yet, you may need to `npm login` or request permissions from @gobengo or @hansl
   npm publish
   ```

6. Verify the new version appears at https://www.npmjs.com/package/@dfinity/agent?activeTab=versions

Afterward:

- You may want to invoke `popd` until you're back to the directory you started in.
