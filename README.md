# agent-js

Use an Agent to interact with the Internet Computer from your JavaScript program.

This source code repository contains multiple npm packages, each under `./packages/`.

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

### Contributing

If you are interested in contributing to this project, please read the [contributing guidelines](./CONTRIBUTING.md).

### Publishing

To publish to NPM, create a branch and run the following commands;

- `git clean -dfx`. Removes all non-tracked files and directories.
- `npm install`. Makes sure everything is installed and up to date locally;
- `npm run build --workspaces`. Builds all the applications and packages.
- `npm run version [patch|major|minor|version]`. Update the version in each of the packages.
- Manually update the version in the root package.json file.
- `npm install`. Updates the versions of the packages in the package-lock.json file.
- `git checkout -b release/v<#.#.#>`. Check out release branch
- `git add .`. Check out release branch
- `git commit -m 'chore: release v<#.#.#>'`. Commit changes
- Open a pull request from your fork of the repository

Once the change is merged, you can publish to NPM. To publish to NPM, run the following commands;

- `npm run build --workspaces`. This is just for safety
- `npm publish --workspaces`. Publishes the packages to NPM.
  - You will need to have authorization to publish the npm packages in our NPM organization. Reach out to IT if you neeed access.
  - You can add the `--dry-run` flag to see what would have been published and make sure that all the versions and packages look correct.

Then, when you have merged the new versions and published to npm, open https://github.com/dfinity/agent-js/releases/new, click the "Draft a new release" button, enter the new tag version in form `v#.#.#`, and click "Publish release".

### Publishing Docs

Until we have an internal process and centrally owned canister, docs can be released manually for `@dfinity/agent` and `@dfinity/authentication`.

- Start from a fresh clone (or `git clean -dfx .`)
- `npm install`
- `npm run make:docs/reference`
- `dfx deploy`

Note - you may need to ask to be added as a controller for the wallet that owns the docs until this job is moved to CI

### Deprecation

We retain deprecated packages in the packages directory for historical purposes. To deprecate a package, follow these steps

- Remove all contents except the package.json, license, and readme
- Add a note to the README saying `**Warning** this package is deprecated`
- Remove unnecessary content, dependencies, and metadata from the package.json
- add a `"deprecation"` tag to the package.json with instructions you want users to follow in migrating
- remove the package as a workspace from the root `package.json`
- the next time that agent-js releases, manually publish a new version of newly deprecated packages by incrementing the patch version and running `npm publish`

### GitHub Actions

GitHub Actions for this repo are configured in [./.github/workflows](./.github/workflows).

- [nodejs-ci.yml](./.github/workflows/nodejs-ci.yml) - For every git push, do a build, test of all packages.
- [commitlint.yml](./.github/workflows/commitlint.yml) - Run [commitlint](https://commitlint.js.org/#/) on every git commit message.

### Master Branch Conventions and Mergify

All commits in the master branch should come from squashed GitHub Pull Requests, and those commit messages should follow the [conventionalcommits.org](https://conventionalcommits.org) syntax.

Mergify can take care of enforcing all of this. Just add the `automerge-squash` label to each Pull Request that Mergify should merge. This policy is configured via [./.mergify.yml](./.mergify).

### bin/\* scripts

The following scripts can be found in [./bin](./bin):

Monorepo-related scripts run in this order, but are usually invoked by `npm install`:

- npm-postinstall - Run with `npm run postinstall` in this monorepo package.
  - It copies devtools dependencies from ./packages/agent-js-devtools/node_modules -> ./node_modules
- build - Build (`npm run build`) each subpackage in ./packages/
- test - Run `npm test` in each subpackage

### Formatting

To save time on formatting, we use automated formatting for this repo using prettier. You can either use git pre-commit hooks or run the command `npm exec prettier:format` before submitting your PR to have your changes pass. We check formatting on CI.
