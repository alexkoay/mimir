
var list = {};

var ctx = require.context('./', true, /^.\/.+\/base$/);
ctx.keys().forEach(key => {
	var sub = ctx(key);
	Object.keys(sub).forEach(query => list[key.substring(2, key.length-4) + query] = sub[query]);
});

export default list;
