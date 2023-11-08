# agent-js

Use an Agent to interact with the Internet Computer from your JavaScript program.

This source code repository contains multiple npm packages, each under `./packages/`.

Note: the `@noble/curves` `verifyShortSignature` function has been audited and merged, but has not yet been released. Once the release is available, we will update the `@dfinity/agent` dependency to use it instead of this manually compiled version

## Development

### Getting Started

1. Clone the git repository.
2. Run `npm i -g npm`
3. Run `npm install`

After that, you probably want to dive into a specific package in [./packages](./packages).

#### Workspaces

We use `npm` to manage this repo and its packages. A few useful
commands to keep in mind;

- To run the unit tests locally, you can use `npm run test`.
- To run e2e tests, you can use `npm run e2e`. **WARNING:** You need to have a running
  replica locally. In our CI runs, we use the `ic-ref` which is not (at this time) available
  publicly. Normally you can use a replica distributed with dfx (ie. dfx start in a project),
  but there is no guarantee that the `next` branch will work with the latest published dfx.
  Once you have a replica running locally, you must pass the port to the e2e tests using the
  `REPLICA_PORT` environment vairable. If that variable is not set, the tests will fail.

### bin/\* scripts

The following scripts can be found in [./bin](./bin):

Monorepo-related scripts run in this order, but are usually invoked by `npm install`:

- npm-postinstall - Run with `npm run postinstall` in this monorepo package.
  - It copies devtools dependencies from ./packages/agent-js-devtools/node_modules -> ./node_modules
- build - Build (`npm run build`) each subpackage in ./packages/
- test - Run `npm test` in each subpackage

## Contributing

Contributions are welcome! Please refer to the [CONTRIBUTING.md](CONTRIBUTING.md), where you can find more details about:

- Setting up the repository, making changes, documenting these changes, adherence to automated formatting like prettier, and Continuous Integration, which is facilitated by GitHub Actions.
- Information about our review process.
- The release process, publishing to NPM, and publishing docs.
- The process for deprecating packages in this repository.

## License

This project is licensed under the [Apache-2.0 License](LICENSE).
