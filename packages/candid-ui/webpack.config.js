import path from 'path';
const __dirname = import.meta.url.substring(7, import.meta.url.lastIndexOf('/'));

export default {
  experiments: { outputModule: true },
  mode: 'production',
  entry: './src/auto.ts',
  output: {
    filename: 'auto.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'window',
    },
    clean: true,
    environment: {
      module: true,
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  optimization: {
    minimize: true,
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    usedExports: true,
  },
};
