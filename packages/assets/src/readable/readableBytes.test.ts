import { ReadableBytes } from './readableBytes';

const transparentPixelGif = [
  71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 0, 0, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1,
  0, 0, 2, 1, 0, 0,
];

describe('ReadableBytes', () => {
  test('ReadableBytes from Uint8Array', async () => {
    const uint8Array = Uint8Array.from(transparentPixelGif);
    const fileName = 'transparent_pixel.gif';
    const readable = new ReadableBytes(fileName, Uint8Array.from(transparentPixelGif));

    expect(readable.fileName).toEqual(fileName);
    expect(readable.contentType).toEqual('image/gif');
    expect(readable.length).toEqual(uint8Array.length);
    await readable.open();
    expect(await readable.slice(16, 24)).toEqual(uint8Array.slice(16, 24));
    await readable.close();
  });

  test('ReadableBytes from number[]', async () => {
    const fileName = 'transparent_pixel.gif';
    const readable = new ReadableBytes(fileName, transparentPixelGif);

    expect(readable.fileName).toEqual(fileName);
    expect(readable.contentType).toEqual('image/gif');
    expect(readable.length).toEqual(transparentPixelGif.length);
    await readable.open();
    expect(await readable.slice(16, 24)).toEqual(
      Uint8Array.from(transparentPixelGif.slice(16, 24)),
    );
    await readable.close();
  });
});
