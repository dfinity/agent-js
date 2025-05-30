import { randomNumber } from './random';
import { Crypto } from '@peculiar/webcrypto';
import { randomInt } from 'node:crypto';

const webcrypto = new Crypto();
beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).window = undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).crypto = undefined;
});

function isInteger(num: number) {
  if (typeof num !== 'number') return false;
  if (isNaN(num)) return false;
  if (num % 1 !== 0) {
    return false;
  }
  if (num <= 0) {
    return false;
  }
  return true;
}

describe('randomNumber', () => {
  it('should use window.crypto if available', () => {
    global.window = {
      crypto: {
        getRandomValues: webcrypto.getRandomValues,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const result = randomNumber();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(isInteger(result)).toBe(true);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });
  it('should use globabl webcrypto if available', () => {
    global.crypto = {
      getRandomValues: webcrypto.getRandomValues,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const result = randomNumber();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(isInteger(result)).toBe(true);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });
  it('should use node crypto if available', () => {
    global.crypto = {
      randomInt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const result = randomNumber();
    expect(isInteger(result)).toBe(true);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });
  it('should use Math.random if nothing else is available', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).crypto = undefined;
    const result = randomNumber();
    expect(isInteger(result)).toBe(true);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });
});
