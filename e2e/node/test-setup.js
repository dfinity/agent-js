// This file may be used to polyfill features that aren't available in the test
// environment, i.e. JSDom.
//
// We sometimes need to do this because our target browsers are expected to have
// a feature that JSDom doesn't.
//
// Note that we can use webpack configuration to make some features available to
// Node.js in a similar way.

globalThis.crypto = require("@trust/webcrypto");
globalThis.TextEncoder = require("text-encoding").TextEncoder;
globalThis.XMLHttpRequest = require('xhr2');
globalThis.fetch = require('node-fetch');
//require("whatwg-fetch");

const { HttpAgent, IDL } = require("@dfinity/agent");
const agent = require("./utils/agent").default;
globalThis.ic = { agent, HttpAgent, IDL };
