import { PipeArrayBuffer } from './buffer';

describe('PipeArrayBuffer', () => {
  test('can read', () => {
    const buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const pipe = new PipeArrayBuffer(buffer);

    expect([...new Uint8Array(pipe.read(3))]).toEqual([1, 2, 3]);
    expect([...new Uint8Array(pipe.read(2))]).toEqual([4, 5]);
    expect([...new Uint8Array(pipe.read(0))]).toEqual([]);
    expect(pipe.readUint8()).toEqual(6);
    expect([...new Uint8Array(pipe.buffer)]).toEqual([7, 8, 9, 10]);

    // Verify it doesn't change the original buffer.
    expect([...buffer]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    expect(pipe.end).toEqual(false);
    expect([...new Uint8Array(pipe.read(999))]).toEqual([7, 8, 9, 10]);
    expect([...new Uint8Array(pipe.read(999))]).toEqual([]);
    expect(pipe.end).toEqual(true);
  });

  test('can write', () => {
    const pipe = new PipeArrayBuffer(undefined);

    expect([...new Uint8Array(pipe.read(1))]).toEqual([]);
    pipe.write(new Uint8Array([1]));
    pipe.write(new Uint8Array([2, 3]));
    expect([...new Uint8Array(pipe.read(3))]).toEqual([1, 2, 3]);
    expect([...new Uint8Array(pipe.read(1))]).toEqual([]);

    pipe.write(new Uint8Array([4, 5]));
    expect([...new Uint8Array(pipe.read(1))]).toEqual([4]);
    expect([...new Uint8Array(pipe.read(1))]).toEqual([5]);
    expect([...new Uint8Array(pipe.read(1))]).toEqual([]);
  });
});
