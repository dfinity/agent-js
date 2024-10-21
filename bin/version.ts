// Bumps the version (@jsonpaths: .version, .dependencies, .peerDependencies, and .devDependencies
// of each package's `package.json` in the monorepo.
// TODO: to be replaced with @release-it/bumper when https://github.com/release-it/bumper/pull/35 is merged

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import prettier from 'prettier';
import process from 'process';

console.time('script duration');
console.log('Updating package versions...');

// Infer info about workspaces from package.json
const rootPackage = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'package.json')).toString(),
);

if (!rootPackage.name) throw new Error("Couldn't find root package.json");

const baseVersion = rootPackage.version;

const newVersion = process.argv[2];
console.log('New version will be: ' + newVersion);

// Read workspaces from root package.json
const workspaces: string[] = rootPackage.workspaces?.packages;

// Identify packages in `/packages directory
const packages = workspaces
  .filter(workspace => workspace.includes('packages'))
  .map(packagePath => packagePath.replace('packages', '@dfinity'));

// Update version in root package.json
workspaces.push('.');

workspaces.forEach(async workspace => {
  const packagePath = path.resolve(__dirname, '..', workspace, 'package.json');
  console.log(packagePath);
  const json = JSON.parse(fs.readFileSync(packagePath).toString());

  // Set version for package
  json.version = newVersion;

  // Update references to any packages that being updated
  if (json.peerDependencies) {
    json.peerDependencies = updateDeps(json.peerDependencies);
  }
  if (json.dependencies) {
    json.dependencies = updateDeps(json.dependencies);
  }
  if (json.devDependencies) {
    json.devDependencies = updateDeps(json.devDependencies);
  }

  const formatted = await prettier.format(JSON.stringify(json), {
    parser: 'json-stringify',
  });

  // Write file
  fs.writeFileSync(packagePath, formatted);
});

function updateDeps(dependencies: Record<string, string>) {
  for (const dep in dependencies) {
    if (Object.prototype.hasOwnProperty.call(dependencies, dep)) {
      if (packages.includes(dep)) {
        dependencies[dep] = '^' + newVersion;
      }
    }
  }
  return dependencies;
}
