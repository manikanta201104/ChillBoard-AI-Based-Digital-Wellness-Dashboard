console.log('Applying custom Webpack configuration...');

module.exports = function override(config) {
  // Suppress source map warnings for face-api.js
  config.ignoreWarnings = [
    {
      module: /node_modules\/face-api\.js/,
      message: /Failed to parse source map/,
    },
  ];

  // Configure source-map-loader to exclude face-api.js
  config.module.rules.push({
    test: /\.js$/,
    enforce: 'pre',
    use: ['source-map-loader'],
    exclude: [/node_modules\/face-api\.js/],
  });

  // Provide fallbacks for Node.js modules
  config.resolve.fallback = {
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    util: require.resolve('util/'),
    zlib: require.resolve('browserify-zlib'),
    stream: require.resolve('stream-browserify'),
    crypto: require.resolve('crypto-browserify'),
    url: require.resolve('url/'),
    assert: require.resolve('assert/'),
    fs: false, // Ignore fs module
  };

  return config;
};