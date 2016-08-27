import DataSet from '../../lib/dataset';
import store from '../../store';
import List from './list';

export default {
	delete: function(i: number) {
		var name = this.data.rows[i][0];
		if (window.confirm('Delete "' + name + '"?')) {
			window.localStorage.removeItem('query/' + name);
		}
		this.refresh();
	},
	refresh: function() {
		this.data.clear();
		this.data.insert(Object.keys(window.localStorage)
			.filter((key: string) => key.startsWith('query/'))
			.map((key: string) => [key.substring(6), window.localStorage.getItem(key)]));
		requestAnimationFrame(m.redraw);
	},

	oninit: function(n: MithrilVNode) {
		this.data = new DataSet([['Name', 'text'], ['Query', 'text']]);
		this.refresh();
	},
	onbeforeupdate: function(n: MithrilVNode) {
		this.refresh();
	},
	view: function(n: MithrilVNode) {
		return m(List, {
			class: 'saved-panel',
			title: 'Saved Queries',
			blank: 'No saved queries.',
			export: this.data.export.bind(this.data, 'xlsx'),
			exporting: this.data.exporting,
			data: this.data.rows ? this.data.rows.map((e: string[]) => ({name: e[0], command: e[1]})) : [],
			delete: this.delete.bind(this),
		});
	}
};
