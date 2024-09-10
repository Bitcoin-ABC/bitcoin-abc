'use strict';
const path = require('path');
const webpack = require('webpack');

const base = {
    mode: 'production',
    entry: path.resolve(__dirname, 'src', 'cashaddr.ts'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        library: 'cashaddr',
        libraryTarget: 'umd',
        globalObject: 'this',
    },
    resolve: {
        fallback: {
            buffer: require.resolve('buffer'),
        },
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.js'],
    },
    module: {
        rules: [
            {
                // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        // Work around for Buffer is undefined:
        // https://github.com/webpack/changelog-v5/issues/10
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
    ],
};

module.exports = [
    Object.assign({}, base, {
        output: Object.assign({}, base.output, {
            filename: 'cashaddrjs.js',
        }),
        optimization: {
            minimize: false,
        },
    }),
    Object.assign({}, base, {
        output: Object.assign({}, base.output, {
            filename: 'cashaddrjs.min.js',
        }),
    }),
];
