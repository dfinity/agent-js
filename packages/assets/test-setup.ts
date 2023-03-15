// This file may be used to polyfill features that aren't available in the test
// environment, i.e. JSDom.
//
// We sometimes need to do this because our target browsers are expected to have
// a feature that JSDom doesn't.
//
// Note that we can use webpack configuration to make some features available to
// Node.js in a similar way.

import mime from 'mime-types';
import { Crypto } from '@peculiar/webcrypto';
import { TextEncoder, TextDecoder } from 'util';
import { MessageChannel } from 'worker_threads';
import { Blob } from '@web-std/file';
class FilePolyfill extends (await import('@web-std/file')).File {
  constructor(init, name, options) {
    super(init, name, options);
    (this as any)._type = mime.lookup(name) || 'application/octet-stream';
  }
}
(global as any).crypto = new Crypto();
global.TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;
(global as any).MessageChannel = MessageChannel;
global.Blob = Blob;
global.File = FilePolyfill;
await import('node-fetch');
