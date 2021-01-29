const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    // plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })],
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.json']
  },
  module: {
    rules: [
      { test: /\.(js|ts)x?$/, loader: "ts-loader" },
      { test: /\.css$/, use: ['style-loader','css-loader'] }
    ]
   },
};

