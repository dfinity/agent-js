import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { exec } from 'child_process';

console.time('script duration');
console.log('Updating package versions...');

// Manage CLI options
const argv = yargs
  .command('patch', 'Increments up a patch version for all packages')
  .command('minor', 'Increments a minor version for all packages')
  .command('major', 'Increments a major version for all packages')
  .example('patch', 'npm run version -- patch')
  .example('minor', 'npm run version -- minor')
  .example('major', 'npm run version -- major')
  .example('custom', 'npm run version -- 0.9.0-beta.1')
  .help()
  .alias('help', 'h').argv;

// Infer info about workspaces from package.json
const rootPackage = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'package.json')).toString(),
);

if (!rootPackage.name) throw new Error("Couldn't find root package.json");

const baseVersion = rootPackage.version;

const newVersion = (() => {
  // eslint-disable-next-line
  let [major, minor, patch, ...rest] = baseVersion.split('.');
  if (argv['_'].includes('patch')) {
    patch = Number(patch) + 1;
  } else if (argv['_'].includes('minor')) {
    minor = Number(minor) + 1;
    patch = 0;
  } else if (argv['_'].includes('major')) {
    major = Number(major) + 1;
    minor = 0;
    patch = 0;
  } else {
    // else use the first argument
    return argv['_'][0].toString();
  }
  return [major, minor, patch, ...rest].join('.');
})();

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

  // Write file
  fs.writeFileSync(packagePath, JSON.stringify(json));
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
