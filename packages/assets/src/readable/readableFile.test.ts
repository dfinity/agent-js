import { ReadableFile } from './readableFile';

describe('ReadableFile', () => {
  test('ReadableFile from File', async () => {
    const file = new File(['Hello world!'], 'hello.txt');
    const readable = new ReadableFile(file);

    expect(readable.fileName).toEqual(file.name);
    readable;
    expect(readable.contentType).toEqual('text/plain');
    expect(readable.length).toEqual(file.size);
    await readable.open();
    expect(await readable.slice(1, 4)).toEqual(
      new Uint8Array(await file.slice(1, 4).arrayBuffer()),
    );
    await readable.close();
  });
});
