const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const prodConfig = require('./webpack.config');

module.exports = {
  ...prodConfig,
  optimization: {
    minimize: false,
    minimizer: []
  },
  mode: 'development',
  devServer: {
    contentBase: './dist',
    hot: true,
    historyApiFallback: true
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerPort: 'auto',
      openAnalyzer: false,
    }),
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
