import { beforeAll, beforeEach, describe, it, expect } from 'vitest';
import { randomNumber } from './random';
import { Crypto } from '@peculiar/webcrypto';
import { randomInt } from 'node:crypto';

const webcrypto = new Crypto();
beforeEach(() => {
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
    });
  }
});

function isInteger(num) {
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
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        getRandomValues: webcrypto.getRandomValues,
      },
    });
    const result = randomNumber();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(isInteger(result)).toBe(true);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });
  it('should use globabl webcrypto if available', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        getRandomValues: webcrypto.getRandomValues,
      },
    });
    const result = randomNumber();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(isInteger(result)).toBe(true);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });
  it('should use node crypto if available', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomInt,
      },
    });
    const result = randomNumber();
    expect(isInteger(result)).toBe(true);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });
  it('should use Math.random if nothing else is available', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
    });

    const result = randomNumber();
    expect(isInteger(result)).toBe(true);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });
});
