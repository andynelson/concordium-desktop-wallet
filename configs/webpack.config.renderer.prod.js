/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Build config for electron renderer process
 */

const webpack = require('webpack');
const path = require('path');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');
const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const { baseConfig, assetsConfig, stylesConfig } = require('./partials');
const CheckNodeEnv = require('../internals/scripts/CheckNodeEnv');
const DeleteSourceMaps = require('../internals/scripts/DeleteSourceMaps');
const { fromRoot } = require('./helpers/pathHelpers');

CheckNodeEnv('production');
DeleteSourceMaps();

const devtoolsConfig =
    process.env.DEBUG_PROD === 'true'
        ? {
              devtool: 'source-map',
          }
        : {};

module.exports = merge(baseConfig, assetsConfig, stylesConfig(true), {
    ...devtoolsConfig,
    mode: 'production',
    target: 'web',
    entry: [
        'core-js',
        'regenerator-runtime/runtime',
        fromRoot('./app/index.tsx'),
    ],

    output: {
        path: fromRoot('./app/dist'),
        publicPath: './dist/',
        filename: 'renderer.prod.js',
    },

    optimization: {
        minimizer: process.env.E2E_BUILD
            ? []
            : [
                  new TerserPlugin({
                      parallel: true,
                      sourceMap: true,
                      cache: true,
                  }),
                  new OptimizeCSSAssetsPlugin({
                      cssProcessorOptions: {
                          map: {
                              inline: false,
                              annotation: true,
                          },
                      },
                  }),
              ],
    },

    experiments: {
        asyncWebAssembly: true,
    },

    plugins: [
        new webpack.EnvironmentPlugin({
            NODE_ENV: 'production',
            DEBUG_PROD: false,
            E2E_BUILD: false,
        }),

        new BundleAnalyzerPlugin({
            analyzerMode:
                process.env.OPEN_ANALYZER === 'true' ? 'server' : 'disabled',
            openAnalyzer: process.env.OPEN_ANALYZER === 'true',
        }),

        new WasmPackPlugin({
            crateDirectory: path.resolve(__dirname, '.'),
        }),
    ],
});
