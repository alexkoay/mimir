var path = require('path');
var webpack = require('webpack');

var extract = require('extract-text-webpack-plugin'),
	autoprefixer = require('autoprefixer'),
	visualizer = require('webpack-visualizer-plugin');

// plugins
var styles = new extract('base.css'),
	replace = new webpack.ContextReplacementPlugin(/moment[\\\/]locale$/, /^\.\/(en-gb)$/),
	stats = new visualizer({filename: './statistics.html'});

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
	plugins: [ styles, replace, stats ],
	postcss: [ autoprefixer({ browsers: ['last 2 versions'] }) ],
	devServer: {
		historyApiFallback: true,
		noInfo: true,
		hot: false,
	},
	devtool: '#eval-source-map',
}

if (process.argv.indexOf('-p') >= 0) {
	module.exports.devtool = '#source-map';
	module.exports.plugins = (module.exports.plugins || []).concat([
		new webpack.DefinePlugin({
			'process.env': { NODE_ENV: '"production"' }
		}),
		new webpack.optimize.UglifyJsPlugin({
			minimize: true,
			debug: false,
			comments: false,
			mangle: true,
			compress: {
				sequences: true,
				dead_code: true,
				conditionals: true,
				booleans: true,
				unused: true,
				if_return: true,
				join_vars: true,
				warnings: false
			},
			sourceMap: true
		}),
		new webpack.optimize.OccurenceOrderPlugin()
	])
}
