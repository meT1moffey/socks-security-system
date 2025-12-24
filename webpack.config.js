// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/react/index.tsx',
  output: {
    path: path.resolve(__dirname, 'static/js'),
    filename: 'react.bundle.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  }
};