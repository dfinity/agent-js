const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const IgnorePlugin = require('webpack').IgnorePlugin

module.exports = {
  mode: 'production',
  entry: {
    'index': './src/index.tsx'
  },
  target: 'web',
  node: {
    // This is needed for wasm loader from emscripten
    fs: 'empty'
  },
  output: {
    // This is necessary to allow internal apps to bundle their own code with
    // webpack which may conflict with us.
    jsonpFunction: '__dfinityJsonp',
    path: path.resolve(__dirname, './dist'),
    filename: '[name]-[hash].js',
    publicPath: '/',
  },
  resolve: {
    plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })],
    extensions: ['.tsx', '.ts', '.js'],
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
      {
        test: /\.tsx?$/,
        use: ['ts-loader'],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: ['file-loader'],
      },
    ],
  },
  plugins: [
    new IgnorePlugin(/^\.\/wordlists\/(?!english)/, /bip39\/src$/),
    new HtmlWebpackPlugin({
      template: 'src/index.html',
      filename: 'index.html',
      chunks: ['identity-provider', 'index'],
    }),
    new CopyWebpackPlugin([
      {
        from: 'src/dfinity.png',
        to: 'favicon.ico',
      },
    ]),
  ],
};
