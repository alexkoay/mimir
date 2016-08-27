import store from '../../store';
import List from './list';

export default {
	load: function(i: number) {
		store.dispatch({type: 'recall', index: i});
	},
	view: function(n: MithrilVNode) {
		var state = store.getState();
		return m(List, {
			class: 'recent-panel',
			title: 'Recent Queries',
			blank: 'No recent queries.',
			load: this.load.bind(this),
			data: state.data.recent.map(e => ({name: e.name || e.command.slice(0, 100), command: e.command, attr: e.failed ? 'error' : null})),
		});
	}
};
