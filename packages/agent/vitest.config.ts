import { defineConfig } from 'vitest/config';

if (!globalThis.crypto) {
  global.crypto = require('@trust/webcrypto');
}

global.TextEncoder = require('text-encoding').TextEncoder;
global.TextDecoder = require('text-encoding').TextDecoder;
global.fetch = require('isomorphic-fetch');
export default defineConfig({});
