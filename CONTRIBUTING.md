# Contributing to this repository

## Getting Started

Directions to set up your project are available in the [README](./README.md).

Before you make your changes, check to see if an [issue exists](https://github.com/dfinity/agent-js/issues). If there isn't one, you can [create one](https://github.com/dfinity/agent-js/issues/new/choose) to discuss your proposed changes.

## Forking the repository

We use the [GitHub forking workflow](https://help.github.com/articles/fork-a-repo/) to manage contributions to this project. Please follow the steps below to create your own fork of this repository.

https://docs.github.com/en/get-started/quickstart/fork-a-repo#fork-an-example-repository

Once you have forked the repository, you can clone it to your local machine.

## Making Changes

Create a branch that is specific to the issue you are working on. If you have a GitHub Issue, use the issue number in the branch name. For example,

```
555-add-a-new-feature
```

Once you have a branch, you can make your changes and commit them to your local repository. In your commit message, please include a reference to the GitHub issue you are working on, formatted using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0-beta.2/#examples). For example,

```
feat: adds a new feature
Closes #555
additional detail if necessary
```

This will automatically link your commit to the GitHub issue, and automatically close it when the pull request is merged.

Please document your changes in the [changelog.html](./docs/generated/changelog.html) file.

### Continuous Integration (CI)

Changes will have to pass automated tests before they can be merged. If your changes fail the tests, you will have to address the failures and re-run the tests.

## Reviewing

A member of the team will review your changes. Once the member has reviewed your changes, they will comment on your pull request. If the member has any questions, they will add a comment to your pull request. If the member is happy with your changes, they will merge your pull request.
