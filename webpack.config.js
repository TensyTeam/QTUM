const path = require('path');
const UglifyEsPlugin = require('uglify-es-webpack-plugin')
const UglifyEsPluginConfig = new UglifyEsPlugin({
	mangle: {
		reserved: [
      'Buffer',
      'BigInteger',
      'Point',
      'ECPubKey',
      'ECKey',
      'sha512_asm',
      'asm',
      'ECPair',
      'HDNode'
    ]
  }
})

module.exports = {
  entry: './index.js',
  output: {
    library: 'TEST',
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    sourceMapFilename: '[name].bundle.map'
  },
  optimization: {
    minimizer: [
        UglifyEsPluginConfig
    ]
}
};

