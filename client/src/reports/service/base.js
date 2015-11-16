
var output = {};

var ctx = require.context('.', false, /\.yaml$/);
ctx.keys().forEach(key => {
	let query = ctx(key);
	output[query.name] = query;
});

export default output;