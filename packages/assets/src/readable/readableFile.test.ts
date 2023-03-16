import { describe, test, expect } from 'vitest';
import { ReadableFile } from './readableFile';

describe('ReadableFile', () => {
  test('ReadableFile from File', async () => {
    const file = new File(['Hello world!'], 'hello.txt', {
      type: 'text/plain',
    });
    const readable = new ReadableFile(file);

    expect(readable.fileName).toEqual(file.name);
    console.log(readable);
    expect(readable.contentType).toEqual('text/plain');
    expect(readable.length).toEqual(file.size);
    await readable.open();
    expect(await readable.slice(1, 4)).toEqual(
      new Uint8Array(await file.slice(1, 4).arrayBuffer()),
    );
    await readable.close();
  });
  test('image file', async () => {
    const file = new File(['Hello world!'], 'hello.png', {
      type: 'image/png',
    });
    const readable = new ReadableFile(file);

    expect(readable.fileName).toEqual(file.name);
    console.log(readable);
    expect(readable.contentType).toEqual('image/png');
    expect(readable.length).toEqual(file.size);
    await readable.open();
    expect(await readable.slice(1, 4)).toEqual(
      new Uint8Array(await file.slice(1, 4).arrayBuffer()),
    );
    await readable.close();
  });
});
