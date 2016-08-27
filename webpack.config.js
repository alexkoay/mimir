var path = require('path');
var webpack = require('webpack');

var extract = require('extract-text-webpack-plugin');
var styles = new extract('base.css');

var autoprefixer = require('autoprefixer');
var visualizer = require('webpack-visualizer-plugin');

module.exports = {
	entry: {
		'base': './source/js/base',
		'export.xlsx': './source/js/export/xlsx'
	},
	resolve: {
		extensions: ['', '.js', '.ts', '.jsx', '.tsx'],
	},
	output: {
		path: path.resolve(__dirname, 'static'),
		publicPath: '/static/',
		filename: '[name].js'
	},
	node: { fs: 'empty', cpexcel: 'empty' },
	resolveLoader: {
		root: path.join(__dirname, 'node_modules'),
	},
	module: {
		loaders: [
			{ test: /\.jsx?$/, loader: 'babel', exclude: /node_modules/ },
			{ test: /\.tsx?$/, loader: 'babel!ts', exclude: /node_modules/ },
			{ test: /\.s?css$/, loader: styles.extract('css!postcss!sass') }
		]
	},
	plugins: [
		styles,
		new webpack.ContextReplacementPlugin(/moment[\\\/]locale$/, /^\.\/(en-gb)$/),
		new visualizer({filename: './statistics.html'})
	],
	postcss: [ autoprefixer({ browsers: ['last 2 versions'] }) ],
	devServer: {
		historyApiFallback: true,
		noInfo: true,
		hot: false,
	},
	devtool: '#eval-source-map'
}

if (process.env.NODE_ENV === 'production') {
	module.exports.devtool = '#source-map';
	module.exports.plugins = (module.exports.plugins || []).concat([
		new webpack.DefinePlugin({
			'process.env': { NODE_ENV: '"production"' }
		}),
		new webpack.UglifyJsPlugin({ comments: false }),
		new webpack.LoaderOptionsPlugin({ minimize: true, debug: false }),
		new webpack.optimize.OccurenceOrderPlugin()
	])
}
