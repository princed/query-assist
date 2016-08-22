/* eslint-env node */
/* eslint-disable modules/no-cjs */

const path = require('path');
const autoprefixer = require('autoprefixer');

const componentsPath = [path.join(__dirname, 'components')];

function resolveLoader(loader) {
  return require.resolve(`${loader}-loader`);
}

const svgSpriteLoader = {
  test: /\.svg$/,
  loaders: [
    `${resolveLoader('svg-sprite')}`
  ],
  include: path.join(__dirname, 'icons')
};

const scssLoader = {
  test: /\.scss$/,
  include: componentsPath,
  loaders: [
    resolveLoader('style'),
    resolveLoader('css'),
    `${resolveLoader('postcss')}?pack=ring-ui`,
    `${resolveLoader('sass')}?outputStyle=expanded&includePaths[]=${componentsPath}`
  ]
};

const babelLoader = {
  test: /\.js$/,
  include: [componentsPath, path.join(__dirname, 'query-assist.js')],
  loader: `${resolveLoader('babel')}?cacheDirectory=true`
};

const gifLoader = {
  test: /\.gif$/,
  include: componentsPath,
  loader: resolveLoader('url')
};

module.exports = {
  entry: {
    'query-assist': './query-assist.js'
  },
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: '/dist/',
    filename: '[name].js'
  },
  module: {
    loaders: [
      svgSpriteLoader,
      scssLoader,
      babelLoader,
      gifLoader
    ]
  },

  postcss: {
    'ring-ui': [autoprefixer]
  }
};
