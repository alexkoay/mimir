
var list = {};

var ctx = require.context('./', true, /^.\/.+\.yaml$/);
ctx.keys().forEach(key => {
	var query = ctx(key);

	if (query.name) { name = key.substring(2, key.lastIndexOf('/')+1) + query.name; }
	else { name = key.substring(2, key.lastIndexOf('.')); }
	list[name] = query;
});

export default list;
