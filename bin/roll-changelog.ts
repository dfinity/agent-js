import { readFile, writeFile } from 'fs';

const newVersion: string = process.argv[2];
if (!newVersion) {
  console.error('Please provide a new version as an argument.');
  process.exit(1);
}

const path: string = 'docs/changelog.html';
const pattern: string = '      <h2>Version x.x.x</h2>';
const replacement: string = `      <h2>Version x.x.x</h2>
      <ul></ul>
      <h2>Version ${newVersion}</h2>`;

readFile(path, 'utf8', (err, data) => {
  if (err) throw err;

  const updatedData: string = data.replace(pattern, replacement);

  writeFile(path, updatedData, 'utf8', err => {
    if (err) throw err;
  });
});
