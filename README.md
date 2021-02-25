# agent-js

Use an Agent to interact with the Internet Computer from your JavaScript program.

This source code repository contains multiple npm packages, each under `./packages/`.

## Development

### Getting Started

1. Clone the git repository.
2. Run `npx lerna bootstrap`

After that, you probably want to dive into a specific package in [./packages](./packages).

#### Lerna

We use [lerna](https://github.com/lerna/lerna) to manage this repo and its packages. A few useful
commands to keep in mind;

- To run the unit tests locally, you can use `npx lerna run test`.
- To run e2e tests, you can use `npx lerna run e2e`. **WARNING:** You need to have a running
  replica locally. In our CI runs, we use the `ic-ref` which is not (at this time) available
  publicly. Normally you can use a replica distributed with dfx (ie. dfx start in a project),
  but there is no guarantee that the `next` branch will work with the latest published dfx.
  Once you have a replica running locally, you must pass the port to the e2e tests using the
  `IC_REF_PORT` environment vairable. If that variable is not set, the tests will fail.
- To run the entire ci, use `npx lerna run ci`. This will validate syntax and linting, as well
  as running tests (both unit and e2e).

You can also install lerna globally and not use `npx` if you wish; run `npm install -g lerna` then
skip the `npx` part of the example commands.

### Publishing

To publish to NPM, create a branch and run the following commands;

* `lerna bootstrap`. Makes sure everything is installed and up to date locally;
* `lerna run build`. Builds all the applications and packages.
* `lerna run test`. Just in case.
* `lerna publish VERSION_NUMBER --dist-tag DIST_TAG`. The `VERSION_NUMBER` should be set to
  the version to be published (e.g. `0.6.30`). The `DIST_TAG` argument can be ignored
  
This will change your code locally, so create a `chore: release VERSION_NUMBER` commit and
push. Once the PR is created get someone to review it.

### GitHub Actions

GitHub Actions for this repo are configured in [./.github/workflows](./.github/workflows).

* [nodejs-ci.yml](./.github/workflows/nodejs-ci.yml) - For every git push, do a build, test of all packages.
* [commitlint.yml](./.github/workflows/commitlint.yml) - Run [commitlint](https://commitlint.js.org/#/) on every git commit message.

### Master Branch Conventions and Mergify

All commits in the master branch should come from squashed GitHub Pull Requests, and those commit messages should follow the [conventionalcommits.org](https://conventionalcommits.org) syntax.

Mergify can take care of enforcing all of this. Just add the `automerge-squash` label to each Pull Request that Mergify should merge. This policy is configured via [./.mergify.yml](./.mergify).

### bin/* scripts


The following scripts can be found in [./bin](./bin):

Monorepo-related scripts run in this order, but are usually invoked by `npm install`:

* npm-postinstall - Run with `npm run postinstall` in this monorepo package.
  * It copies devtools dependencies from ./packages/agent-js-devtools/node_modules -> ./node_modules
* build - Build (`npm run build`) each subpackage in ./packages/
* test - Run `npm test` in each subpackage
