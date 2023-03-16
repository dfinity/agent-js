// This file may be used to polyfill features that aren't available in the test
// environment, i.e. JSDom.
//
// We sometimes need to do this because our target browsers are expected to have
// a feature that JSDom doesn't.
//
// Note that we can use webpack configuration to make some features available to
// Node.js in a similar way.
import crypto from '@trust/webcrypto';
import fetch from 'isomorphic-fetch';
import { TextEncoder, TextDecoder } from 'text-encoding';
import { beforeEach } from 'vitest';

beforeEach(() => {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
  global.crypto = crypto;
  global.fetch = fetch;
});
