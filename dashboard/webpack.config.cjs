const path = require('path');
const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const TerserPlugin = require('terser-webpack-plugin');
const packageJson = require('./package.json');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isAnalyze = env && env.analyze;

  const config = {
    entry: './js/index.js', // Your main JavaScript file
    output: {
      filename: 'flowdash.min.js', // The bundled file name
      path: path.resolve(__dirname, 'dist'), // The output directory
      library: 'flowdash',
      // Enable tree shaking
      environment: {
        arrowFunction: true,
        const: true,
        destructuring: true,
        dynamicImport: true,
        forOf: true,
        module: true,
      },
    },
    // Externalize D3.js to reduce bundle size
    externals: {
      d3: 'd3',
    },
    // Enable tree shaking and optimizations
    mode: 'production',
    optimization: {
      // Enable tree shaking
      usedExports: true,
      sideEffects: false,
      // Enable minification
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              // Remove console.log, console.warn, etc. in production
              drop_console: true,
              // Remove debugger statements
              drop_debugger: true,
            },
            format: {
              comments: /^!/,
            },
          },
          extractComments: false,
        }),
      ],
      // Enable module concatenation
      concatenateModules: true,
      // Enable dead code elimination
      removeAvailableModules: true,
      removeEmptyChunks: true,
      // Split vendor chunks for better caching
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            enforce: true,
          },
        },
      },
    },
    plugins: [
      new webpack.BannerPlugin({
        banner: `flowdash v${packageJson.version} | (c) schalken.net | Licensed under the MIT License. See https://opensource.org/licenses/MIT`,
        entryOnly: true,
      }),
    ],
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    // Enable tree shaking
                    modules: false,
                    // Target modern browsers for smaller bundles
                    targets: {
                      browsers: ['last 2 versions', '> 1%', 'not dead'],
                    },
                    // Use built-ins to reduce bundle size
                    useBuiltIns: 'usage',
                    corejs: 3,
                  },
                ],
              ],
            },
          },
        },
      ],
    },
  };

  // Add bundle analyzer plugin when analyzing
  if (isAnalyze) {
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'server',
        analyzerHost: '127.0.0.1',
        analyzerPort: 8888,
        reportFilename: 'report.html',
        defaultSizes: 'parsed',
        openAnalyzer: true,
        generateStatsFile: false,
        statsFilename: 'stats.json',
        statsOptions: null,
        logLevel: 'info',
      }),
    );
  }

  return config;
};
