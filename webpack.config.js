const path = require("path");
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: {
    'charsheet': './src/CharacterSheet/index.tsx',
    "charsheet_styles": './src/CharacterSheet/app.scss',
    'fizzbuzz': './src/FizzBuzz.ts',
    'react': './src/ReactDemo.tsx',
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'awesome-typescript-loader',
      },
      {
        test: /\.(png|jpe?g|svg|woff2?)$/,
        use: 'file-loader'
      },
      {
        test: /\.scss$/,
        use: [
            "style-loader", // creates style nodes from JS strings
            "css-loader", // translates CSS into CommonJS
            "sass-loader" // compiles Sass to CSS
        ]
      }
    ]
  },
  

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json']
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Deadlands Character Sheet",
      filename: "index.html",
      template: "assets/index.html",
      chunks: ["charsheet_styles", "charsheet" ],
    }),
    new HtmlWebpackPlugin({
      title: "FizzBuzz",
      filename: "fizzbuzz.html",
      template: "assets/index.html",
      chunks: ["fizzbuzz"],
    }),
    new HtmlWebpackPlugin({
      title: "React",
      filename: "react.html",
      template: "assets/index.html",
      chunks: ["react"],
    })
  ]
};
