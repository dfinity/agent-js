# agent-js

Use an Agent to interact with the Internet Computer from your JavaScript program.

This source code repository contains multiple npm packages, each under `./packages/`.

## Development

### Getting Started

1. Clone the git repository.
2. Install the version of node specified in `.nvmrc`.
3. Run `corepack enable` to enable `pnpm`.

After that, you probably want to dive into a specific package in [./packages](./packages).

### Running Tests

Running tests is a good way to get a sense of what the features will do. We try to have full unit test coverage for all new features, although sometimes mocking network conditions can be difficult, and e2e tests may be preferable.

Before running tests, you need to compile the packages.

```shell
pnpm build
```

This command will compile the packages and generate the output under `lib` directory in each package.

#### Unit Tests

To run the unit tests for all packages, run `pnpm test`. You can run tests for a specific package by running `pnpm test` in the package directory or by running `pnpm run -F <package-name> test` in the root directory.

#### E2E Tests

There are two sets of e2e tests in this repository. They are located in `e2e/browser` and `e2e/node`. The browser tests are run in a headless browser, and the node tests are run in a node environment. The node tests are faster and require less setup, but the browser tests can simulate relevant environmental conditions.

> **Important Note:** the e2e tests do not run from the TypeScript source code of projects and must be compiled. You should run `pnpm build` to compile the projects after your changes before running the tests.

To run the e2e node tests, you can run

```shell
pnpm run -F @e2e/node setup
pnpm run -F @e2e/node e2e
```

We expect you to have the replica running on port `4943`. If you are using a different port, you can set an environment variable `REPLICA_PORT` to the port number.

> Note: browser tests have been temporarily removed pending a rewrite

To run the e2e browser tests, you can run

```shell
pnpm run -F @e2e/browser setup
pnpm run -F @e2e/browser e2e
```

#### Workspaces

We use `pnpm` to manage this repo and its packages. A few useful
commands to keep in mind;

- To run the unit tests locally, you can use `pnpm test`.
- To run e2e tests, you can use `pnpm e2e`. **WARNING:** You need to have a running
  replica locally.

### bin/\* scripts

The following scripts can be found in [./bin](./bin):

- update-management-idl - Update the management canister IDL in @dfinity/agent

Monorepo-related scripts run in this order, but are usually invoked by `pnpm i`:

- postinstall - Run with `pnpm postinstall` in this monorepo package.
  - It copies devtools dependencies from ./packages/agent-js-devtools/node_modules -> ./node_modules
- build - Build (`pnpm build`) each subpackage in ./packages/
- test - Run `pnpm test` in each subpackage

## Contributing

Contributions are welcome! Please refer to the [CONTRIBUTING.md](.github/CONTRIBUTING.md), where you can find more details about:

- Setting up the repository, making changes, documenting these changes, adherence to automated formatting like prettier, and Continuous Integration, which is facilitated by GitHub Actions.
- Information about our review process.
- The release process, publishing to NPM, and publishing docs.
- The process for deprecating packages in this repository.

## License

This project is licensed under the [Apache-2.0 License](LICENSE).
