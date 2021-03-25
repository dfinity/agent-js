const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    index: path.join(__dirname, 'index.js'),
  },
  // Although Cloudflare workers are technically NOT web workers, this is recommended
  // best practice by Cloudflare are the API is close enough (and webpack doesn't have
  // custom targets).
  target: 'webworker',
  output: {
    path: path.join(__dirname, 'worker'),
  },
};
