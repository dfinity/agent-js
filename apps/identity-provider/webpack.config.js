const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const webpack = require('webpack');
const { merge } = require('webpack-merge');

const commonConfig = {
  entry: {
    index: path.join(__dirname, './src/index.tsx'),
  },
  target: 'web',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name]-[fullhash].js',
    publicPath: '/',
  },
  resolve: {
    plugins: [
      new TsconfigPathsPlugin({ configFile: './tsconfig.json' }),
    ],
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      process: "process/browser"
    },
    fallback: {
      "assert": require.resolve("assert/"),
      "events": require.resolve("events/"),
      "stream": require.resolve("stream-browserify/"),
      "util": require.resolve("util/"),
    },
  },
  devtool: 'source-map',
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
    new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
    new webpack.IgnorePlugin(/^\.\/wordlists\/(?!english)/, /bip39\/src$/),
    new webpack.ProvidePlugin({
      process: require.resolve('process/browser'),
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

const productionConfig = {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          ecma: 2020,
        },
      }),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        dfinity: {
          test: /[\\/]packages[\\/](agent|authentication)[\\/]/,
          name: 'dfinity',
          chunks: 'initial',
        },
        react: {
          test: /[\\/]node_modules[\\/]react(-dom)?[\\/]/,
          name: 'react',
          chunks: 'initial',
        },
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendor",
          chunks: "initial",
        },
      },
    },
  },
};

const developmentConfig = {
  mode: 'development',
  devServer: {
    contentBase: './dist',
    hot: true,
    historyApiFallback: true,
    serveIndex: true,
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerPort: 'auto',
      openAnalyzer: false,
    }),
  ],
};

module.exports = (env) => {
  if (env === "development") {
    return merge(commonConfig, developmentConfig);
  } else if (env === "production") {
    return merge(commonConfig, productionConfig);
  } else if (env === undefined) {
    console.error("No environment specified, defaulting to prod.")
    return merge(commonConfig, productionConfig);
  } else {
    throw new Error(`Invalid environment name: "${JSON.stringify(env)}"`);
  }
}
