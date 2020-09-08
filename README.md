# agent-js

Use an Agent to interact with the Internet Computer from your JavaScript program.

This source code repository contains multiple npm packages, but it's primary export is at `./packages/agent`.

## Development

### Getting Started

1. Clone the git repository.
2. Run `npm install`

After that, you probably want to dive into a specific package in [./packages](./packages).

### Cross-Package Commands

Use `npx` to fetch-and/or-invoke the `lerna` CLI (Note: the `lerna` cli is also usually at `./node_modules/.bin/lerna` after `npm install`).

#### Run `npm run test` in all packages.

```
npx lerna run test
```

#### Run `npm run lint` in all packages.

```
npx lerna run lint
```

#### Add a new npm dependency to package '@dfinity/agent'

```
npx lerna add dependency-name --scope='@dfinity/agent'
```

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
