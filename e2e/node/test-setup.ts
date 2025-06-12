/* eslint-disable @typescript-eslint/no-explicit-any */
// This file may be used to polyfill features that aren't available in the test
// environment, i.e. JSDom.
//
// We sometimes need to do this because our target browsers are expected to have
// a feature that JSDom doesn't.
//
// Note that we can use webpack configuration to make some features available to

// Node.js in a similar way.
import { TextEncoder, TextDecoder } from 'text-encoding';
import fetch from 'isomorphic-fetch';
import dotenv from 'dotenv';

dotenv.config();
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
global.fetch = fetch;

import { subtle } from 'crypto';
import { expect } from 'vitest';
import { uint8Equals } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';

// make global.crypto writeable
Object.defineProperty(global, 'crypto', {
  writable: true,
  value: { ...global.crypto, subtle },
});

function isPrincipal(value: unknown): value is Principal {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_isPrincipal' in value &&
    value._isPrincipal === true
  );
}

function testPrincipalEquality(a: unknown, b: unknown): boolean | undefined {
  const isPrincipalA = isPrincipal(a);
  const isPrincipalB = isPrincipal(b);

  if (isPrincipalA && isPrincipalB) {
    return a.compareTo(b) === 'eq';
  }

  if (isPrincipalA === isPrincipalB) {
    return undefined;
  }

  return false;
}

function testUint8Equality(a: unknown, b: unknown): boolean | undefined {
  const isUint8ArrayA = a instanceof Uint8Array;
  const isUint8ArrayB = b instanceof Uint8Array;

  if (isUint8ArrayA && isUint8ArrayB) {
    return uint8Equals(a, b);
  }

  if (isUint8ArrayA || isUint8ArrayB) {
    return false;
  }

  return undefined;
}

expect.addEqualityTesters([testPrincipalEquality, testUint8Equality]);
