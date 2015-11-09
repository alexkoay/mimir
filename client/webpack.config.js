module.exports = {
  entry: {
  	Socket: './src/base',
  },
  output: { filename: 'mimir.js', library: 'mimir' },
  resolve: { extensions: ['.ts', '.js'] },
  module: {
    loaders: [
      { test: /\.ts$/, exclude: /node_modules/, loader: 'babel-loader!ts-loader' }
    ]
  }
}