import Service from './service/base';

var list = {};
Object.keys(Service).forEach(key => list['Service/'+key] = Service[key]);

function load(root) { root.insertNewChild('report/load', {item: 'reports', states: list}); };

export default {load};
