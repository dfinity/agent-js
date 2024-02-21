import { readFile, writeFile } from 'fs';

const newVersion: string = process.argv[2];
if (!newVersion) {
  console.error('Please provide a new version as an argument.');
  process.exit(1);
}
const now = new Date();
const formattedDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

const path: string = 'docs/CHANGELOG.md';
const pattern: string = '## [Unreleased]';
const replacement: string = `## [Unreleased]

## [${newVersion}] - ${formattedDate}`;

readFile(path, 'utf8', (err, data) => {
  if (err) throw err;

  const updatedData: string = data.replace(pattern, replacement);

  writeFile(path, updatedData, 'utf8', err => {
    if (err) throw err;
  });
});
