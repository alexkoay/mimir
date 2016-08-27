import store from '../../store';
import { hide, load, execute } from '../../actions/editor';

export default {
	get: function(type: string) { return types[type]; },

	select: function(i: number) {
		if (this.selected === i) { this.selected = null; }
		else { this.selected = i; }
	},
	load: function(n: MithrilVNode) {
		var i = this.selected;
		if (i === null) { return; }
		if (n.attrs.hide !== undefined) { store.dispatch(hide(n.attrs.hide)); }
		if (n.attrs.load) { n.attrs.load(i); }
		else {
			store.dispatch(load(n.attrs.data[i].name, n.attrs.data[i].command));
			store.dispatch(execute());
		}
	},

	oninit: function(n: MithrilVNode) {
		this.selected = null;
	},
	view: function(n: MithrilVNode) {
		return m('div.list-panel',
			{ class: n.attrs.class },
			m('div.toolbar',
				m('div.title', n.attrs.title || 'Query List'),
				n.attrs.refresh ? m('button.mini', {onclick: n.attrs.refresh.bind(this), disabled: n.attrs.refreshing}, n.attrs.refreshing ? 'Refreshing...' : 'Refresh') : null,
				n.attrs.export ? m('button.mini', {onclick: n.attrs.export.bind(this), disabled: n.attrs.exporting}, n.attrs.exporting ? 'Exporting...' : 'Export') : null
			),
			m('ul',
				n.attrs.data.length == 0 
					? m('li.blank', n.attrs.blank || 'No records found.')
					: n.attrs.data.map((e: any, i: number) =>
						m('li.item',
							{class: (e.attr || '') + (this.selected === i ? ' selected' : ''), onclick: this.select.bind(this, i)},
							this.selected === i ? m('button.load', {onclick: this.load.bind(this, n)}, '✓') : null,
							m('span.content', e.elem || e.name),
							(this.selected === i && n.attrs.delete) ? m('button.delete', {onclick: n.attrs.delete.bind(null, i)}, 'X') : null
						)
					)
			)
		);
	}
};

import recent from './recent';
import reports from './reports';
import saved from './saved';
var types: any = { recent, reports, saved };