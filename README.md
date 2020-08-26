# agent-js

Use an Agent to interact with the Internet Computer from your JavaScript program.

This source code repository contains multiple npm packages, and [lerna](https://lerna.js.org/) provides tools for managing the monorepo. Currently we use lerna in ['fixed' mode](https://github.com/lerna/lerna#fixedlocked-mode-default), which means all packages are the same version. This may change in the future.

## Development

### Getting Started

1. Clone the git repository.
2. Run `npm install`
    * The npm postinstall script should automatically call `lerna bootstrap`, which will install/link all subpackages.

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

When developing these configuration files, you may test with [nektos/act](https://github.com/nektos/act). Please do your best to keep all workflows working with act.

### Master Branch Conventions and Mergify

All commits in the master branch should come from squashed GitHub Pull Requests, and those commit messages should follow the [conventionalcommits.org](https://conventionalcommits.org) syntax.

Mergify can take care of enforcing all of this. Just add the `automerge-squash` label to Pull Request that Mergify should merge. This policy is configured via [./.mergify.yml](./.mergify).
