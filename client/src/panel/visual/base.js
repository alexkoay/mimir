var ctx = require.context('.', false);
ctx.keys().forEach(key => ctx(key));
export default null;