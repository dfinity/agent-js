import { readFile, writeFile } from 'fs';

const newVersion: string = process.argv[2];
if (!newVersion) {
  console.error('Please provide a new version as an argument.');
  process.exit(1);
}

const path: string = 'docs/CHANGELOG.md';
const pattern: string = 'Version x.x.x';
const replacement: string = `Version x.x.x
-------------

Version ${newVersion}`;

readFile(path, 'utf8', (err, data) => {
  if (err) throw err;

  const updatedData: string = data.replace(pattern, replacement);

  writeFile(path, updatedData, 'utf8', err => {
    if (err) throw err;
  });
});
