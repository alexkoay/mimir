import Query from '../../lib/query';
import socket from '../../socket';

export default {
	status: function(data: Query) : MithrilChild {
		if (!socket.authed) return m('span.error', 'Not logged in!');
		if (!data)          return ['No query to run.'];
		if (data.failed)    return ['An error occured after ', data.elapsed.toFixed(1), 's.'];
		if (data.cancelled) return ['Cancelled query.'];
		if (data.waiting)   return ['Waiting... (', data.elapsed.toFixed(1), 's)'];
		if (data.executing) return ['Running query... (', data.elapsed.toFixed(1), 's)'];
		if (data.executed)  return ['Loading data... (', data.elapsed.toFixed(1), 's)'];
		if (data.completed) return ['Loaded in ', data.elapsed.toFixed(1), 's.'];
		return ['Unknown status.'];
	},

	view: function(n: MithrilVNode) {
		var data: Query = n.attrs.data;
		return m('div.toolbar',
			 (data.completed || data.cancelled || data.failed
				? m('button', {onclick: data.query.bind(data)}, data.completed ? 'Refresh' : 'Retry')
				: m('button', {onclick: data.cancel.bind(data)}, 'Cancel')),
			m('div.info', this.status(data)),
			m('div.spacer'),
			m('div.info.-secondary', data.rows.length, ' / ', data.count),
			m('button', {
				onclick: data.export.bind(data, 'xlsx') || null,
				disabled: !data.completed || data.exporting
			}, data.exporting ? 'Exporting...' : 'Export')
		);
	}
};
