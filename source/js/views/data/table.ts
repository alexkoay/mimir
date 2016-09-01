import defer from 'lodash/defer';
import DataSet from '../../lib/dataset';
import Viewport from './viewport';

export function get_string(val: any, type: string): string {
	if (val === null) { return '<blank>'; }
	else if (type == 'date') { return val.getFullYear().toString() + '-' + ('00' + (val.getMonth() + 1)).slice(-2) + '-' + ('00' + val.getDate()).slice(-2); }
	else if (type == 'timestamptz') {
		return val.getFullYear().toString() + '-' + ('00' + (val.getMonth() + 1)).slice(-2) + '-' + ('00' + val.getDate()).slice(-2)
			+ ' ' + ('00' + val.getHours()).slice(-2) + ':' + ('00' + val.getMinutes()).slice(-2) + ':' + ('00' + val.getSeconds()).slice(-2);
	}
	else if (type == 'interval') { 
		return moment().add(val).fromNow();
	}
	else if (type == 'json' || type == 'jsonb') { return JSON.stringify(val); }
	else { return val.toString(); }
}

function build_row(cols: [string, string][], row: any[], offset: number) {
	return m('tr.row',
		{	key: offset,
			class: offset % 2 == 0 ? 'even' : 'odd'
		},
		m('td.int4', m('div', offset+1)),
		row.map((col, j) => {
			var full = get_string(col, cols[j][1]);
			var lines = full.split('\n');
			return m('td',
				{class: cols[j][1], title: full},
				m('div', lines.length > 1 ? m('span.more', '\u2026') : null, lines[0].trim())
			);
		}),
		m('td')
	);
}

export default {
	cache: function(n: MithrilVNode) {
		var cols = (<DataSet> n.attrs.data).cols || [],
			rows = (<DataSet> n.attrs.data).rows;

		for (var i=this.$cache.length; i < rows.length; ++i) {
			this.$cache.push(build_row(cols, rows[i], i));
		}
	},

	resize: function(el: HTMLElement) {
		var gcs = window.getComputedStyle;

		// measure header height
		var head = el.querySelector('table.data thead');
		var row = el.querySelector('table.data tbody tr.row');
		var height = el.clientHeight;

		this.$header = parseFloat(gcs(head).height);
		this.$height = parseFloat(gcs(row).height);

		// measure viewport
		var count = Math.ceil(height / this.$height) || 100;
		if (this.$view.show != count) { this.$view.show = count; }

		defer(m.redraw);
	},
	scroll: function(el: HTMLElement) {
		var gcs = window.getComputedStyle;

		// get elements
		var tsrc = el.querySelector('table.data');
		var tdst = el.querySelector('table.header');

		var hsrc = el.querySelectorAll('table.data th');
		var hdst = el.querySelectorAll('table.header th');

		// get widths
		var twidth = gcs(tsrc).width;
		var hwidths: string[] = [];
		for (var i=0; i<hsrc.length; ++i) { hwidths.push(gcs(hsrc[i]).width); }

		(<HTMLElement> tdst).style.width = twidth;
		hwidths.forEach((w, i) => {
			var ow = (<HTMLElement> hdst[i]).style.width;
			if (ow != w) { (<HTMLElement> hdst[i]).style.width = w; }
		});
	},

	onscroll: function(e: Event) {
		this.$view.offset = Math.floor((<HTMLDivElement> e.target).scrollTop / this.$height);
		this.$left = (<HTMLDivElement> e.target).scrollLeft;
	},

	oninit: function(n: MithrilVNode) {
		this.$view = new Viewport();
		this.$view.size = n.attrs.data.rows.length;
		this.$cache = [];
	},
	onbeforeupdate: function(n: MithrilVNode) {
		this.$view.size = n.attrs.data.rows.length;
		return true;
	},
	oncreate: function(n: MithrilVNode) {
		this.resize(n.dom);
		this.scroll(n.dom);
		window.addEventListener('resize', this.resize.bind(this, n.dom));
	},
	onupdate: function(n: MithrilVNode) { defer(() => this.scroll(n.dom)); },
	view: function(n: MithrilVNode) {
		// this.cache(n);
		var cols = (<DataSet> n.attrs.data).cols || [],
			rows = (<DataSet> n.attrs.data).rows;

		var view: Viewport = this.$view;
		var data = rows.slice(view.first, view.last);
		// var data: [string, string, boolean][][] = this.$cache.slice(view.first, view.last);

		return m('div.table-panel',
			m('div.header-container',
				m('table.header',
					{ style: {'margin-left': (-this.$left || 0) + 'px'} },
					m('thead',
						m('tr.name', m('th', '#'), cols.map(col => m('th', {class: col[1]}, col[0])), m('th')),
						m('tr.type', m('td', ''), cols.map(col => m('td', {class: col[1]}, col[1])), m('td'))
					)
				)
			),
			m('div.data-container',
				{ onscroll: this.onscroll.bind(this) },
				m('table.data',
					{ style: {'margin-top': (-this.$header - 1) + 'px'} },
					m('thead',
						m('tr.name', m('th', '#'), cols.map(col => m('th', {class: col[1]}, col[0])), m('th')),
						m('tr.type', m('td', ''), cols.map(col => m('td', {class: col[1]}, col[1])), m('td'))
					),
					m('tbody',
						m('tr.before', {style: { height: (view.before * this.$height) + 'px' } }),
						data.map((row, i) => build_row(cols, row, i+view.first)),
						m('tr.after', {style: {height: (view.after * this.$height) + 'px' } })
					)
				)
			)
		);
	}
};
