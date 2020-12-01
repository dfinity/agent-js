const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
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
  output: {
    publicPath: '/',
  },
  plugins: [
    ...prodConfig.plugins,
    new BundleAnalyzerPlugin({
      analyzerPort: 'auto',
      openAnalyzer: false,
    }),
  ],
};
