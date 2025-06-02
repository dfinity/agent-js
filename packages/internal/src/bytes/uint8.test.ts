import { concat, compare, uint8Equals, uint8ToDataView, uint8FromBufLike } from './uint8';

describe('concat', () => {
  test('concat multiple arrays', () => {
    const a1 = new Uint8Array([1, 2]);
    const a2 = new Uint8Array([3, 4, 5]);
    const a3 = new Uint8Array([6]);

    expect([...concat(a1, a2, a3)]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('concat with empty arrays', () => {
    const a1 = new Uint8Array([]);
    const a2 = new Uint8Array([1, 2]);
    const a3 = new Uint8Array([]);

    expect([...concat(a1, a2, a3)]).toEqual([1, 2]);
    expect([...concat(a1, a3)]).toEqual([]);
  });

  test('concat with no arrays', () => {
    expect([...concat()]).toEqual([]);
  });
});

describe('uint8FromBufLike', () => {
  test('from Uint8Array', () => {
    const original = new Uint8Array([1, 2, 3]);
    const result = uint8FromBufLike(original);
    expect(result).toBe(original); // Should return the same instance
  });

  test('from ArrayBuffer', () => {
    const buffer = new ArrayBuffer(3);
    const view = new Uint8Array(buffer);
    view.set([1, 2, 3]);

    const result = uint8FromBufLike(buffer);
    expect([...result]).toEqual([1, 2, 3]);
  });

  test('from array', () => {
    const array = [1, 2, 3];
    const result = uint8FromBufLike(array);
    expect([...result]).toEqual([1, 2, 3]);
  });

  test('from DataView', () => {
    const buffer = new ArrayBuffer(3);
    const view = new Uint8Array(buffer);
    view.set([1, 2, 3]);
    const dataView = new DataView(buffer);

    const result = uint8FromBufLike(dataView);
    expect([...result]).toEqual([1, 2, 3]);
  });

  test('from object with buffer', () => {
    const buffer = new ArrayBuffer(3);
    const view = new Uint8Array(buffer);
    view.set([1, 2, 3]);
    const obj = { buffer };

    const result = uint8FromBufLike(obj);
    expect([...result]).toEqual([1, 2, 3]);
  });
});

describe('compare', () => {
  test('equal arrays', () => {
    const a1 = new Uint8Array([1, 2, 3]);
    const a2 = new Uint8Array([1, 2, 3]);

    expect(compare(a1, a2)).toBe(0);
  });

  test('different length arrays', () => {
    const a1 = new Uint8Array([1, 2, 3]);
    const a2 = new Uint8Array([1, 2]);
    const a3 = new Uint8Array([1, 2, 3, 4]);

    expect(compare(a1, a2)).toBeGreaterThan(0);
    expect(compare(a2, a1)).toBeLessThan(0);
    expect(compare(a1, a3)).toBeLessThan(0);
  });

  test('same length but different content', () => {
    const a1 = new Uint8Array([1, 2, 3]);
    const a2 = new Uint8Array([1, 2, 4]);
    const a3 = new Uint8Array([1, 3, 2]);

    expect(compare(a1, a2)).toBeLessThan(0);
    expect(compare(a2, a1)).toBeGreaterThan(0);
    expect(compare(a1, a3)).toBeLessThan(0);
  });

  test('empty arrays', () => {
    const a1 = new Uint8Array([]);
    const a2 = new Uint8Array([]);

    expect(compare(a1, a2)).toBe(0);
  });
});

describe('uint8Equals', () => {
  test('equal arrays', () => {
    const a1 = new Uint8Array([1, 2, 3]);
    const a2 = new Uint8Array([1, 2, 3]);

    expect(uint8Equals(a1, a2)).toBe(true);
  });

  test('different arrays', () => {
    const a1 = new Uint8Array([1, 2, 3]);
    const a2 = new Uint8Array([1, 2, 4]);
    const a3 = new Uint8Array([1, 2]);

    expect(uint8Equals(a1, a2)).toBe(false);
    expect(uint8Equals(a1, a3)).toBe(false);
  });

  test('empty arrays', () => {
    const a1 = new Uint8Array([]);
    const a2 = new Uint8Array([]);

    expect(uint8Equals(a1, a2)).toBe(true);
  });
});

describe('uint8ToDataView', () => {
  test('convert Uint8Array to DataView', () => {
    const array = new Uint8Array([1, 2, 3, 4]);
    const view = uint8ToDataView(array);

    expect(view instanceof DataView).toBe(true);
    expect(view.byteLength).toBe(4);
    expect(view.getUint8(0)).toBe(1);
    expect(view.getUint8(1)).toBe(2);
    expect(view.getUint8(2)).toBe(3);
    expect(view.getUint8(3)).toBe(4);
  });

  test('with invalid input', () => {
    expect(() => uint8ToDataView('not a uint8array' as unknown as Uint8Array)).toThrow(
      'Input must be a Uint8Array',
    );
    expect(() => uint8ToDataView(null as unknown as Uint8Array)).toThrow(
      'Input must be a Uint8Array',
    );
  });

  test('with empty array', () => {
    const array = new Uint8Array([]);
    const view = uint8ToDataView(array);

    expect(view instanceof DataView).toBe(true);
    expect(view.byteLength).toBe(0);
  });

  test('with offset array', () => {
    const buffer = new ArrayBuffer(6);
    const array = new Uint8Array(buffer, 2, 3);
    array.set([1, 2, 3]);

    const view = uint8ToDataView(array);

    expect(view instanceof DataView).toBe(true);
    expect(view.byteLength).toBe(3);
    expect(view.getUint8(0)).toBe(1);
    expect(view.getUint8(1)).toBe(2);
    expect(view.getUint8(2)).toBe(3);
  });
});
