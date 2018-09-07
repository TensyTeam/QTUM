const path = require('path');

module.exports = {
  mode: "development",
  entry: './index.js',
  output: {
    library: 'TEST',
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  
  module: {
  }
};