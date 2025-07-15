// This file may be used to polyfill features that aren't available in the test
// environment, i.e. JSDom.
//
// We sometimes need to do this because our target browsers are expected to have
// a feature that JSDom doesn't.
//
// Note that we can use webpack configuration to make some features available to
// Node.ts in a similar way.

import { Crypto } from '@peculiar/webcrypto';
import { TextEncoder, TextDecoder } from 'text-encoding';

global.crypto = new Crypto() as globalThis.Crypto;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
