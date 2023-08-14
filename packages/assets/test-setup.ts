// This file may be used to polyfill features that aren't available in the test
// environment, i.e. JSDom.
//
// We sometimes need to do this because our target browsers are expected to have
// a feature that JSDom doesn't.
//
// Note that we can use webpack configuration to make some features available to
// Node.js in a similar way.

import mime from 'mime-types';

if (!globalThis.crypto) {
  global.crypto = require('@peculiar/webcrypto');
}
global.TextEncoder = require('text-encoding').TextEncoder;
global.TextDecoder = require('text-encoding').TextDecoder;
global.MessageChannel = require('worker_threads').MessageChannel;

if (!globalThis.fetch) {
  global.Blob = require('@web-std/file').Blob;
}

if (!globalThis.File) {
  // @ts-ignore File polyfill with additional mime type polyfill
  global.File = class FilePolyfill extends require('@web-std/file').File {
    constructor(init: BlobPart[], name?: string, options?: FilePropertyBag | undefined) {
      super(init, name, options);
      this._type = mime.lookup(name) || 'application/octet-stream';
    }
  };
}
require('whatwg-fetch');
