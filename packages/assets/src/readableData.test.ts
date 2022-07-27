import { DataConfig, DefaultReadableDataImpl } from './readableData';
import { basename, resolve } from 'path';
import { statSync, readFileSync } from 'fs';

const transparentPixelGif = [
  71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 0, 0, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1,
  0, 0, 2, 1, 0, 0,
];

describe('ReadableData', () => {
  test('ReadableData from File', async () => {
    const file = new File(['Hello world!'], 'hello.txt');
    const readableData = new DefaultReadableDataImpl(file);

    expect(readableData.fileName).toEqual(file.name);
    expect(readableData.path).toEqual('/');
    expect(readableData.contentType).toEqual('text/plain');
    expect(readableData.length).toEqual(file.size);
    expect(readableData.contentEncoding).toEqual('identity');
    await readableData.open();
    expect(await readableData.slice(1, 4)).toEqual(
      new Uint8Array(await file.slice(1, 4).arrayBuffer()),
    );
    await readableData.close();
  });

  test('ReadableData from Blob', async () => {
    const blob = new Blob(['Hello world!']);
    const fileName = 'hello.txt';
    const readableData = new DefaultReadableDataImpl(blob, { fileName });

    expect(readableData.fileName).toEqual(fileName);
    expect(readableData.path).toEqual('/');
    expect(readableData.contentType).toEqual('text/plain');
    expect(readableData.length).toEqual(blob.size);
    expect(readableData.contentEncoding).toEqual('identity');
    await readableData.open();
    expect(await readableData.slice(1, 4)).toEqual(
      new Uint8Array(await blob.slice(1, 4).arrayBuffer()),
    );
    await readableData.close();
  });

  test('ReadableData from Uint8Array', async () => {
    const uint8Array = Uint8Array.from(transparentPixelGif);
    const fileName = 'transparent_pixel.gif';
    const readableData = new DefaultReadableDataImpl(uint8Array, { fileName });

    expect(readableData.fileName).toEqual(fileName);
    expect(readableData.path).toEqual('/');
    expect(readableData.contentType).toEqual('image/gif');
    expect(readableData.length).toEqual(uint8Array.length);
    expect(readableData.contentEncoding).toEqual('identity');
    await readableData.open();
    expect(await readableData.slice(16, 24)).toEqual(uint8Array.slice(16, 24));
    await readableData.close();
  });

  test('ReadableData from number[]', async () => {
    const fileName = 'transparent_pixel.gif';
    const readableData = new DefaultReadableDataImpl(transparentPixelGif, { fileName });

    expect(readableData.fileName).toEqual(fileName);
    expect(readableData.path).toEqual('/');
    expect(readableData.contentType).toEqual('image/gif');
    expect(readableData.length).toEqual(transparentPixelGif.length);
    expect(readableData.contentEncoding).toEqual('identity');
    await readableData.open();
    expect(await readableData.slice(16, 24)).toEqual(
      Uint8Array.from(transparentPixelGif.slice(16, 24)),
    );
    await readableData.close();
  });

  test('ReadableData from file path', async () => {
    const path = resolve(__dirname, '../package.json');
    const readableData = new DefaultReadableDataImpl(path);

    expect(readableData.fileName).toEqual(basename(path));
    expect(readableData.path).toEqual('/');
    expect(readableData.contentType).toEqual('application/json');
    expect(readableData.length).toEqual(statSync(path).size);
    expect(readableData.contentEncoding).toEqual('identity');
    await readableData.open();
    expect(await readableData.slice(16, 24)).toEqual(
      new Uint8Array(readFileSync(path).subarray(16, 24)),
    );
    await readableData.close();
  });

  test('ReadableData with config', async () => {
    const path = resolve(__dirname, '../package.json');
    const config: DataConfig = {
      fileName: 'test.txt',
      path: '/a/b/c',
      contentType: 'text/plain',
      contentEncoding: 'gzip',
      sha256: Uint8Array.from([1, 2, 3]),
    };
    const readableData = new DefaultReadableDataImpl(path, config);

    expect(readableData.fileName).toEqual(config.fileName);
    expect(readableData.path).toEqual(config.path);
    expect(readableData.contentType).toEqual(config.contentType);
    expect(readableData.contentEncoding).toEqual(config.contentEncoding);
    expect(readableData.sha256).toEqual(config.sha256);
  });
});
