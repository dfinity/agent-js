// This file may be used to polyfill features that aren't available in the test
// environment, i.e. JSDom.
//
// We sometimes need to do this because our target browsers are expected to have
// a feature that JSDom doesn't.
//
// Note that we can use webpack configuration to make some features available to
// Node.js in a similar way.

global.crypto = require("@trust/webcrypto");
global.TextEncoder = require("text-encoding").TextEncoder;
global.fetch = require("node-fetch");

const { HttpAgent, IDL } = require("@dfinity/agent");
const agent = require("./utils/agent").default;
global.ic = { agent, HttpAgent, IDL, canister: undefined };
