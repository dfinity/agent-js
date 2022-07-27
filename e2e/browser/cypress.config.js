/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const { defineConfig } = require('cypress');
const webpackPreprocessor = require('@cypress/webpack-preprocessor');

const options = {
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        ],
      },
    ],
  },
};

module.exports = defineConfig({
  video: false,
  e2e: {
    setupNodeEvents(on, config) {
      on('file:preprocessor', webpackPreprocessor(options));
    },
  },
});
