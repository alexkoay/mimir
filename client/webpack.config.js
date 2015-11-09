module.exports = {
  entry: './src/base',
  output: { filename: 'mimir.js', library: 'mimir' },
  resolve: { extensions: ['.js', '.ts'] },
  module: {
    loaders: [
      { test: /\.ts$/, loader: 'babel!ts' }
    ]
  }
}