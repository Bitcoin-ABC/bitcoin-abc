const path = require('path');
const pkg = require('./package.json');

const base = {
    mode: 'production',
    entry: path.resolve(__dirname, 'src', 'cashaddr.js'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        library: 'cashaddr',
        libraryTarget: 'umd',
        globalObject: 'this',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', { targets: 'defaults' }],
                        ],
                    },
                },
            },
        ],
    },
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
