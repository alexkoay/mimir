
var output = {};

var ctx = require.context('.', false, /\.yaml$/);
ctx.keys().forEach(key => {
	let query = ctx(key);
	output[query.data.name] = query;
});

export default output;