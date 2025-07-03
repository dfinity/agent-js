// Bumps the version (@jsonpaths: .version of each package's `package.json` in the monorepo.
// TODO: to be replaced with @release-it/bumper when https://github.com/release-it/bumper/pull/35 is merged

import fs from 'fs';
import path from 'path';
import prettier from 'prettier';
import process from 'process';
import yaml from 'yaml';

import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__filename)

console.time('script duration');
console.log('Updating package versions...');

// Infer info about workspaces from package.json
const workspaceConfig = yaml.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'pnpm-workspace.yaml')).toString(),
);

console.log(process.argv)
const newVersion = process.argv[process.argv.length - 1];
console.log('New version will be: ' + newVersion);

const excluded = ['e2e/node'];
// Read workspaces from root package.json
const workspaces = workspaceConfig.packages.filter(workspace => {
  return !excluded.includes(workspace);
});

// Update version in root package.json
workspaces.push('.');

workspaces.forEach(async workspace => {
  const packagePath = path.resolve(__dirname, '..', workspace, 'package.json');
  console.log(packagePath);
  const json = JSON.parse(fs.readFileSync(packagePath).toString());

  // Set version for package
  json.version = newVersion;

  const formatted = await prettier.format(JSON.stringify(json), {
    parser: 'json-stringify',
  });

  // Write file
  fs.writeFileSync(packagePath, formatted);
});
