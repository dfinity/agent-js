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
import dotenv from 'dotenv';
dotenv.config();
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;

import fetch from 'isomorphic-fetch';
global.fetch = fetch;

import { subtle } from 'crypto';
import { expect } from 'vitest';
import { uint8Equals } from '@dfinity/candid';

// make global.crypto writeable
Object.defineProperty(global, 'crypto', {
  writable: true,
  value: { ...global.crypto, subtle },
});

expect.addEqualityTesters([uint8Equals]);
