import socket from '../socket';
import Header from './header/header';
import Query from './query/query';
import List from './list/list';
import Data from './data/data';

import store from '../store';

export default {
	modal: function(show: string) { this.$modal = show; },
	keydown: function(e: KeyboardEvent) {
		if (e.altKey) {
			if (e.key == 'r' || e.key == 'R') { store.dispatch({type: 'retry'}); } 
			else if (e.key == 'c' || e.key == 'C') { store.dispatch({type: 'cancel'}); }
			else if (e.key == 's' || e.key == 'S') { store.dispatch({type: 'save'}); }
		}
	},

	oninit: function(n: MithrilVNode) {
		document.addEventListener('keydown', this.keydown.bind(this));
	},
	page: function(): MithrilChild {
		var state = store.getState();
		if (state.view === 'reports') return m(List.get('reports'));
		if (state.view === 'saved')   return m(List.get('saved'));
		return null;
	},

	view: function(n: MithrilVNode) {
		var state = store.getState();
			var page = this.page(state.view);
		return [
			m(Header),
			m(Query, {class: page !== null ? 'remove' : ''}),
			m(Data, {data: state.data.current, class: page !== null ? 'remove' : ''}),
			page,
		];
	}
};
