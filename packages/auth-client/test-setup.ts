// This file may be used to polyfill features that aren't available in the test
// environment, i.e. JSDom.
//
// We sometimes need to do this because our target browsers are expected to have
// a feature that JSDom doesn't.
//
// Note that we can use webpack configuration to make some features available to
// Node.js in a similar way.
import 'fake-indexeddb/auto';
global.TextEncoder = require('text-encoding').TextEncoder;
global.TextDecoder = require('text-encoding').TextDecoder;
require('whatwg-fetch');

import { Crypto } from '@peculiar/webcrypto';
const crypto = new Crypto();

Object.defineProperty(globalThis, 'crypto', {
  value: crypto,
});

Object.defineProperty(global, 'console', {
  writable: true,
  value: { ...global.console, log: jest.fn(), warn: jest.fn(), error: jest.fn() },
});
