// This file may be used to polyfill features that aren't available in the test
// environment, i.e. JSDom.
//
// We sometimes need to do this because our target browsers are expected to have
// a feature that JSDom doesn't.
//
// Note that we can use webpack configuration to make some features available to
// Node.js in a similar way.

import mime from 'mime';
import { TextEncoder, TextDecoder } from 'text-encoding';
import { Crypto } from '@peculiar/webcrypto';
import { Blob, File } from '@web-std/file';
import 'whatwg-fetch';

global.crypto = new Crypto();
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.Blob = Blob;
global.File = class FilePolyfill extends File {
  constructor(init: BlobPart[], name: string, options?: FilePropertyBag | undefined) {
    super(init, name, {
      ...options,
      type: mime.getType(name ?? '') || 'application/octet-stream',
    });
  }
};
