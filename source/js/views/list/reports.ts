import socket from '../../socket';
import List from './list';

export default {
	refresh: function() {
		this.context.raw('*', '')
			.then((data: any) => { this.data = data; this.data.sort((d: any[]) => [d[1], d[0]]); })
			.then(m.redraw);
	},

	oninit: function(n: MithrilVNode) {
		this.context = socket.acquire('reports');
		this.data = [];
		this.refresh();
	},
	view: function(n: MithrilVNode) {
		return m(List, {
			class: 'reports-panel',
			title: 'Reports',
			blank: 'No reports found.',
			refresh: this.refresh.bind(this),
			refreshing: !this.context.ready,
			hide: true,
			data: this.data.map((e: string[]) => ({name: e[1], command: e[2]})),
		});
	}
};
