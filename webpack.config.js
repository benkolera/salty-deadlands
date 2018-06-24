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
        test: /\.(png|jpe?g|svg)$/,
        use: 'file-loader'
      },
      { 
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, 
        loader: "url-loader?limit=10000&mimetype=application/font-woff" 
      },
      { 
        test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, 
        loader: "file-loader" 
      },
      {
        test: /\.scss$/,
        use: [
            "style-loader", // creates style nodes from JS strings
            "css-loader", // translates CSS into CommonJS
            "sass-loader" // compiles Sass to CSS
        ]
      },
      {
        test: /\.css$/,
        use: [
            "style-loader", // creates style nodes from JS strings
            "css-loader", // translates CSS into CommonJS
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
