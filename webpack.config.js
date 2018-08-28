const webpack = require("webpack");
const path = require('path');
const nodeExternals = require('webpack-node-externals');

const srcPath = path.resolve(__dirname, 'src');
const distPath = path.resolve(__dirname, 'dist');

module.exports = {
    name: "Migration",
    //context: srcPath,
    entry: {
        "migration": path.resolve(srcPath, "migration/index.ts"),
        "migration-cli": path.resolve(srcPath, "migration-cli/index.ts")
    },
    output: {
        path: distPath,
        filename: "[name].js",
    },
    target: "node",
    resolve: {
        extensions: [".json", ".ts", ".tsx", ".js"],
        modules: [ "src", "node_modules" ]
    },
    externals: [nodeExternals(), 'pg', 'sqlite3', 'tedious', 'pg-hstore'],
    module: {
        rules: [
            {
                test: /.tsx?$/,
                exclude: [ /node_modules/ , path.resolve(__dirname, 'node_modules')],
                include: path.resolve('./src'),
                use: [ { loader: 'ts-loader' } ]
            }
        ]
    },
    plugins: [

    ],
    stats: {
        colors: true,
        hash: false,
        version: false,
        timings: false,
        assets: false,
        chunks: false,
        modules: false,
        reasons: false,
        children: false,
        source: false,
        errors: true,
        errorDetails: true,
        warnings: false,
        publicPath: false
    }
}