# @icp-sdk/migrate

CLI tool to automatically migrate your project from `agent-js` packages to `@icp-sdk/core`.

## What it does

This tool automatically performs the migration steps described in the [upgrading guide](https://js.icp.build/core/latest/upgrading):

1. **Removes old dependencies**: Automatically removes all `@dfinity/*` packages from your project
2. **Adds new dependency**: Installs `@icp-sdk/core` package
3. **Updates imports**: Finds and replaces all import statements in your source code

## Supported package managers

- npm
- yarn
- pnpm

## Installation

```bash
npm install -g @icp-sdk/migrate
```

Or run directly with npx:

```bash
npx @icp-sdk/migrate@latest
```

## Usage

### Basic usage

Run the migration tool in your project directory:

```bash
icp-migrate
```

### Specify a directory

```bash
icp-migrate /path/to/your/project
```

### Options

- `--dry-run`: Show what would be migrated without making changes (not yet implemented)
- `--verbose`: Enable verbose output
- `--help`: Show help information

## What gets migrated

The tool automatically migrates these packages:

| Old Package                   | New Import Path                    |
| ----------------------------- | ---------------------------------- |
| `@dfinity/agent`              | `@icp-sdk/core/agent`              |
| `@dfinity/candid`             | `@icp-sdk/core/candid`             |
| `@dfinity/identity`           | `@icp-sdk/core/identity`           |
| `@dfinity/identity-secp256k1` | `@icp-sdk/core/identity-secp256k1` |
| `@dfinity/principal`          | `@icp-sdk/core/principal`          |

## Supported file types

The tool processes these file types:

- `.ts` (TypeScript)
- `.js` (JavaScript)
- `.tsx` (TypeScript React)
- `.jsx` (JavaScript React)

## Example

Before migration:

```typescript
import { HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
```

After migration:

```typescript
import { HttpAgent } from '@icp-sdk/core/agent';
import { IDL } from '@icp-sdk/core/candid';
import { Principal } from '@icp-sdk/core/principal';
```

## Safety

- The tool only processes source files (ignores `node_modules`, `dist`, `build`, etc.)
- It creates a backup of your files before making changes
- You can review all changes before committing

## Requirements

- Node.js 20+
- A valid `package.json` file in your project
- One of the supported package managers (npm, yarn, or pnpm)

## Troubleshooting

If you encounter issues:

1. Make sure you're running the command from a project directory with a `package.json`
2. Check that you have write permissions in the project directory
3. Ensure your package manager is properly configured
4. Run with `--verbose` for more detailed error information

## Contributing

This tool is part of the `agent-js` project. Please report issues and contribute at [https://github.com/dfinity/agent-js](https://github.com/dfinity/agent-js).
