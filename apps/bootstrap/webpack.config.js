const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    bootstrap: './src/index.ts',
    candid: './src/candid/candid.ts',
    login: './src/login.ts',
    worker: './src/worker.ts',
  },
  target: 'web',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name]-[hash].js',
  },
  resolve: {
    plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })],
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      process: "process/browser"
    },
    fallback: {
      "buffer": require.resolve("buffer/"),
      "events": require.resolve("events/"),
      "stream": require.resolve("stream-browserify/"),
      "util": require.resolve("util/"),
    },
  },
  devtool: 'source-map',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true, // Must be set to true if using source-maps in production
        terserOptions: {
          ecma: 8,
          minimize: true,
          comments: false,
          // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
        },
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {  test: /\.(jsx|ts|tsx)$/,
        use: {
          loader: "ts-loader",
          options: {
            // eslint-disable-next-line no-undef
            configFile: path.join(__dirname, 'tsconfig.json'),
            projectReferences: true,
          }
        }
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.html',
      filename: 'index.html',
      chunks: ['bootstrap'],
    }),
    new HtmlWebpackPlugin({
      template: 'src/worker.html',
      filename: 'worker.html',
      chunks: ['worker'],
    }),
    new HtmlWebpackPlugin({
      template: 'src/candid/candid.html',
      filename: 'candid/index.html',
      chunks: ['bootstrap', 'candid'],
    }),
    new HtmlWebpackPlugin({
      template: 'src/login.html',
      filename: 'login.html',
      chunks: ['login'],
    }),
    new CopyWebpackPlugin([
      {
        from: 'src/dfinity.png',
        to: 'favicon.ico',
      },
    ]),
    new webpack.ProvidePlugin({
      Buffer: [require.resolve('buffer/'), 'Buffer'],
      process: require.resolve('process/browser'),
    }),
  ],
  devServer: {
    proxy: {
      '/api': 'http://localhost:' + (process.env['IC_REF_PORT'] || 8001),
    },
  },
};
