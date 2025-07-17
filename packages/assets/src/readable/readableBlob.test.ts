import { ReadableBlob } from './readableBlob.ts';

describe('ReadableBlob', () => {
  test('ReadableBlob from Blob', async () => {
    const blob = new Blob(['Hello world!']);
    const fileName = 'hello.txt';
    const readable = new ReadableBlob(fileName, blob);

    expect(readable.fileName).toEqual(fileName);
    expect(readable.contentType).toEqual('text/plain');
    expect(readable.length).toEqual(blob.size);
    await readable.open();
    expect(await readable.slice(1, 4)).toEqual(
      new Uint8Array(await blob.slice(1, 4).arrayBuffer()),
    );
    await readable.close();
  });
});
