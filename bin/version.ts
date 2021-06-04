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
  .option('tag', {
    alias: 't',
    description: 'Set the tag that the packages should be published to',
    type: 'string',
    default: 'latest',
  })
  .option('publish', {
    description: 'Should the packages be published?',
    type: 'boolean',
    default: false,
  })
  .default({ tag: 'set-version' })
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
  if (argv._.includes('patch')) {
    patch = Number(patch) + 1;
  } else if (argv._.includes('minor')) {
    minor = Number(minor) + 1;
  } else if (argv._.includes('major')) {
    major = Number(major) + 1;
  } else {
    // else use the immediately following argument
    return argv._[0];
  }
  return [major, minor, patch, ...rest].join('.');
})();

rootPackage.version = newVersion;

console.log('New version will be: ' + newVersion);

const workspaces: string[] = rootPackage.workspaces?.packages;

const packages = workspaces
  .filter(workspace => workspace.includes('packages'))
  .map(packagePath => packagePath.replace('packages', '@dfinity'));

workspaces.forEach(async workspace => {
  const packagePath = path.resolve(__dirname, '..', workspace, 'package.json');
  const json = JSON.parse(fs.readFileSync(packagePath).toString());

  json.version = newVersion;
  if (json.peerDependencies) {
    json.peerDependencies = updateDeps(json.peerDependencies);
  }
  if (json.dependencies) {
    json.dependencies = updateDeps(json.dependencies);
  }
  if (json.devDependencies) {
    json.devDependencies = updateDeps(json.devDependencies);
  }

  fs.writeFileSync(packagePath, JSON.stringify(json));
});
function updateDeps(dependencies: Record<string, string>) {
  for (const dep in dependencies) {
    if (Object.prototype.hasOwnProperty.call(dependencies, dep)) {
      if (packages.includes(dep)) {
        dependencies[dep] = '^' + newVersion.toString();
      }
    }
  }
  return dependencies;
}
// Update version in root package.json
fs.writeFileSync(path.resolve(__dirname, '..', 'package.json'), JSON.stringify(rootPackage));

// Prettier format the modified package.json files
exec(`npm run prettier:format`, error => {
  if (error) {
    throw new Error(JSON.stringify(error));
  }

  if (argv.publish) {
    // Publish packages to npm using provided tag
    console.log('Publishing packages to npm with tag' + argv.tag);
    exec(
      `npm publish --workspaces${argv.tag ? ` --tag ${argv.tag}` : ''} --access-public`,
      error => {
        if (error) {
          throw new Error(JSON.stringify(error));
        }
        // wrap up
        console.log('success!');
        console.timeEnd('script duration');
      },
    );
  } else {
    // wrap up
    console.log('success!');
    console.timeEnd('script duration');
  }
});
