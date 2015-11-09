module.exports = [
  {
    name: 'mimir',
    entry: './src/base',
    output: { filename: 'mimir.js', library: 'mimir' },
    resolve: { extensions: ['', '.ts'] },
    module: { loaders: [ { test: /\.ts$/, loader: 'babel!ts' } ] }
  },
  {
    name: 'reports',
    entry: './src/reports/base',
    output: { filename: 'mimir.reports.js', library: ['mimir', 'Reports'] },
    resolve: { extensions: ['', '.js', '.yaml'] },
    module: {
      loaders: [
        { test: /\.js$/, loader: 'babel' },
        { test: /\.yaml$/, loader: 'json!yaml' },
      ]
    }
  }
]