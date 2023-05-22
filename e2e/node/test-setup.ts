// This file may be used to polyfill features that aren't available in the test
// environment, i.e. JSDom.
//
// We sometimes need to do this because our target browsers are expected to have
// a feature that JSDom doesn't.
//
// Note that we can use webpack configuration to make some features available to

// Node.js in a similar way.
import { TextEncoder, TextDecoder } from 'text-encoding'; // eslint-disable-line
// import fetch from 'isomorphic-fetch';
// global.crypto = crypto as unknown as Crypto;
// console.log('subtle', crypto['subtle']); // eslint-disable-line
global.TextDecoder = TextDecoder; // eslint-disable-line
global.TextEncoder = TextEncoder;

// global.TextDecoder = TextDecoder; // eslint-disable-line
// (global.fetch as any) = fetch;
import fetch from 'isomorphic-fetch';
global.fetch = fetch;
import * as crypto from 'crypto';

(global as any).crypto = {
  subtle: (crypto.webcrypto as any).subtle,
};
