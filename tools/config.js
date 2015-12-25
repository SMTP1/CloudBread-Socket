import webpack from 'webpack';
import AssetsPlugin from 'assets-webpack-plugin';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import { merge } from 'lodash';
import { resolve } from 'path';

export const ROOT = resolve(__dirname, '../');
export const buildPath = `${ROOT}/build`;
export const buildStaticPath = `${buildPath}/public`;
export const srcPath = `${ROOT}/src`;

export const DEBUG = !process.argv.includes('--release');
export const VERBOSE = process.argv.includes('--verbose');
const GLOBALS = {
  'process.env.NODE_ENV': DEBUG ? `'development'` : `'production'`,
  __DEV__: DEBUG,
};
export const stats = {
  colors: true,
  reasons: DEBUG,
  hash: VERBOSE,
  version: VERBOSE,
  timings: true,
  chunks: VERBOSE,
  chunkModules: VERBOSE,
  cached: VERBOSE,
  cachedAssets: VERBOSE,
};

const webpackCommon = {
  output: {
    publicPath: '/',
    sourcePrefix: ' ',
  },
  cache: DEBUG,
  debug: DEBUG,
  stats,
  resolve: {
    extensions: ['', '.jsx', '.json', '.js'],
  },
  module: {
    preLoaders : [
      {
       test: /\.json$/,
       loader: 'json-loader',
      },
    ],
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader',
        query: {
          presets: ['react', 'es2015', 'stage-0', 'stage-1', 'stage-2', 'stage-3'],
        },
      },
    ],
  },
};

export const webpackClient = merge({}, webpackCommon, {
  entry: {
    app: [
      ...(DEBUG ? ['webpack-hot-middleware/client'] : []),
      'babel-polyfill',
      `${srcPath}/client.jsx`,
    ],
  },
  target: 'web',
  output: {
    path: buildStaticPath,
    filename: DEBUG ? '[name].js?[hash]' : '[name].[hash].js',
  },
  devtool: DEBUG ? 'cheap-module-eval-source-map' : false,
  plugins: [
    new webpack.DefinePlugin(GLOBALS),
    new webpack.optimize.OccurenceOrderPlugin(),
    new AssetsPlugin({
      path: buildPath,
      filename: 'assets.json',
    }),
    ...(DEBUG ? [
      // development
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoErrorsPlugin(),
    ] : [
      // productions
      new ExtractTextPlugin('style.css', {
        allChunks: true,
      }),
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          screw_ie8: true,
          warnings: VERBOSE,
        },
      }),
      new webpack.optimize.AggressiveMergingPlugin(),
    ]),
  ],
});

if (DEBUG) {
  webpackClient.module.loaders
    .filter(x => x.loader === 'babel-loader')
    .forEach(x => x.query = {
      ...x.query,
      plugins: [
        ['react-transform', {
          transforms: [{
            transform: 'react-transform-hmr',
            imports: ['react'],
            locals: ['module']
          }, {
            'transform': 'react-transform-catch-errors',
            'imports': ['react', 'redbox-react']
          }]
        }]
      ],
    });
}

export const webpackServer = merge({}, webpackCommon, {
  entry: {
    server: [
      'babel-polyfill',
      `${srcPath}/server.jsx`,
    ],
  },
  output: {
    path: buildPath,
    filename: '[name].js',
    libraryTarget: 'commonjs2',
  },
  devtool: 'source-map',
  target: 'node',
  node: {
    console: false,
    global: false,
    process: false,
    Buffer: false,
    __filename: false,
    __dirname: false,
  },
  externals: [
    /^\.\/assets\.json$/,
    function filter(context, request, cb) {
      const isExternal = request.match(/^[@a-z][a-z\/\.\-0-9]*$/i);
      return cb(null, Boolean(isExternal));
    },
  ],
  plugins: [
    new webpack.DefinePlugin(GLOBALS),
    new webpack.BannerPlugin(
      `require('source-map-support').install();`,
      { raw: true, entryOnly: false }
    ),
  ],
});
