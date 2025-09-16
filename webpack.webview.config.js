const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        analytics: './src/webview/analytics.tsx',
        playground: './src/webview/playground.tsx'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        publicPath: '/'
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/webview/analytics.html',
            filename: 'analytics.html',
            chunks: ['analytics']
        }),
        new HtmlWebpackPlugin({
            template: './src/webview/playground.html',
            filename: 'playground.html',
            chunks: ['playground']
        })
    ],
    devtool: 'source-map'
};