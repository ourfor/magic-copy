const webpack = require("webpack");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const srcDir = path.join(__dirname, "..", "src");
const InlineChunkHtmlPlugin = require("react-dev-utils/InlineChunkHtmlPlugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  devtool: "inline-source-map",
  mode: "development",
  entry: {
    main: path.join(srcDir, "web.tsx"),
  },
  output: {
    path: path.join(__dirname, "../dist/"),
    filename: "[name].js",
  },
  devServer: {
    open: true,
    host: '0.0.0.0',
    static: './dist',
    compress: true,
    port: 9000,
  },
  optimization: {
    runtimeChunk: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
            from: "./public/manifest.figma.json",
            to: "./manifest.json",
        },
        {
            from: "./public/demo.jpg",
            to: "./demo.jpg"
        }
      ],
      options: {},
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    })
  ],
};