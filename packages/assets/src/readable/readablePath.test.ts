import { basename, resolve } from 'path';
import { ReadablePath } from './readablePath.ts';
import { readFileSync, statSync } from 'fs';

describe('ReadablePath', () => {
  test('ReadablePath from path', async () => {
    const path = resolve(__dirname, '../../package.json');
    const readable = await ReadablePath.create(path);

    expect(readable.fileName).toEqual(basename(path));
    expect(readable.contentType).toEqual('application/json');
    expect(readable.length).toEqual(statSync(path).size);
    await readable.open();
    expect(await readable.slice(16, 24)).toEqual(
      new Uint8Array(readFileSync(path).subarray(16, 24)),
    );
    await readable.close();
  });
});
