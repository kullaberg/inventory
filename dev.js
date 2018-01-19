const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

//
module.exports = function e(env) {
  return {
    entry: {
      entry: "./entry.js"
    },
    output: {
      path: __dirname + "/public",
      filename: "./js/[name].js?[hash]",
      chunkFilename: "./js/[id].js?[hash]"
    },
    stats: {
      warnings: false
    },
    devtool: "cheap-module-source-map",
    module: {
      rules: [
        {
          test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader:
            "url-loader?limit=1000000000&mimetype=application/font-woff"
        },
        {
          test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader:
            "url-loader?limit=3000000000&name=./img/[name].[ext]?[hash]"
        },
        {
          test: /\.(ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          loader: "file-loader?name=./img/[name].[ext]?[hash]"
        },
        {
          test: /\.(scss|sass|css)$/,
          use: [
            {
              loader: "style-loader" // creates style nodes from JS strings
            },
            {
              loader: "css-loader" // translates CSS into CommonJS
            },
            {
              loader: "sass-loader" // compiles Sass to CSS
            }
          ]
        },
        {
          test: /\.(gif|png|jpe?g)$/i,
          loaders: ["url-loader?limit=300"]
        },

        {
          test: /\.js$/,
          exclude: [/node_modules/]
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        title: "Front-End-Test",
        template: "./app/index.ejs"
      })
    ]
  };
};
