console.log('Applying custom Webpack configuration...');
module.exports = function override(config) {
  config.module.rules.push({
    test: /\.js$/,
    enforce: 'pre',
    use: ['source-map-loader'],
    exclude: [/node_modules\/face-api\.js/]
  });

  config.resolve.fallback = {
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    util: require.resolve('util/'),
    zlib: require.resolve('browserify-zlib'),
    stream: require.resolve('stream-browserify'),
    crypto: require.resolve('crypto-browserify'),
    url: require.resolve('url/'),
    assert: require.resolve('assert/'),
  };

  return config;
};