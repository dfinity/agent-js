const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const dfxJson = require("./dfx.json");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

// Get the network name, or `local` by default.
const getNetworkName = () => process.env["DFX_NETWORK"] || "local"

// List of all aliases for canisters. This creates the module alias for
// the `import ... from "ic:canisters/xyz"` where xyz is the name of a
// canister.
const aliases = Object.entries(dfxJson.canisters).reduce(
  (acc, [name, _value]) => {
    const outputRoot = path.join(
      __dirname,
      ".dfx",
      getNetworkName(),
      "canisters",
      name
    );

    return {
      ...acc,
      ["ic:canisters/" + name]: path.join(outputRoot, name + ".js"),
      ["ic:idl/" + name]: path.join(outputRoot, name + ".did.js"),
    };
  },
  {},
);

/**
 * Generate a webpack configuration for a canister.
 */
function generateWebpackConfigForCanister(name, info) {
  if (typeof info.frontend !== "object") {
    return;
  }
  return {
    target: 'web',
    mode: "production",
    entry: {
      index: path.join(__dirname, info.frontend.entrypoint),
    },
    devtool: 'cheap-source-map',
    optimization: {
      minimize: true,
      minimizer: [new TerserPlugin()],
    },
    resolve: {
      // plugins: [new TsconfigPathsPlugin({ configFile: './tsconfig.json' })],
      alias: aliases,
      extensions: [ '.ts', '.tsx', '.js', '.jsx', '.json', ],
    },
    output: {
      filename: "[name].js",
      path: path.join(__dirname, "dist", name),
    },

    // Depending in the language or framework you are using for
    // front-end development, add module loaders to the default
    // webpack configuration. For example, if you are using React
    // modules and CSS as described in the "Adding a stylesheet"
    // tutorial, uncomment the following lines:
    module: {
     rules: [
       {  test: /\.(jsx|ts|tsx)$/,
          use: {
            loader: "ts-loader",
            options: { configFile: path.join(__dirname, 'tsconfig.json')}
          }
        },
       { test: /\.css$/, use: ['style-loader','css-loader'] }
     ]
    },
    node: {
      fs: "empty"
    },
    plugins: [
      new CleanWebpackPlugin(),
    ],
  };
}

// If you have additional webpack configurations you want to build
//  as part of this configuration, add them to the section below.
module.exports = [
  ...Object.entries(dfxJson.canisters)
    .map(([name, info]) => {
      return generateWebpackConfigForCanister(name, info);
    })
    .filter((x) => !!x),
];
