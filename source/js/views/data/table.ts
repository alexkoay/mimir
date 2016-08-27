import debounce from 'lodash/debounce';
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
		return val + ' seconds';
	}
	else if (type == 'json' || type == 'jsonb') { return JSON.stringify(val); }
	else { return val.toString(); }
}

export default {
	resize: function(el: HTMLElement) {
		var gcs = window.getComputedStyle;

		// measure header height
		var head = el.querySelector('table.data thead');
		this.$header = parseFloat(gcs(head).height);

		// measure row height
		var row = el.querySelector('table.data tbody tr.row');
		this.$height = parseFloat(gcs(row).height);

		// measure viewport
		var count = Math.ceil(el.clientHeight / this.$height) || 100;
		if (this.$view.show != count) { this.$view.show = count; }

		requestAnimationFrame(m.redraw);
	},
	scroll: function(el: HTMLElement) {
		var gcs = window.getComputedStyle;

		// match table width
		var srct = el.querySelector('table.data');
		var dstt = el.querySelector('table.header');
		(<HTMLElement> dstt).style.width = gcs(srct).width;

		// match column width
		var src = el.querySelectorAll('table.data th');
		var dst = el.querySelectorAll('table.header th');
		for (var i=0; i<src.length; ++i) {
			(<HTMLElement> dst[i]).style.width = gcs(src[i]).width;
		}
	},

	onscroll: function(e: Event) {
		this.$view.offset = Math.floor((<HTMLDivElement> e.target).scrollTop / this.$height);
		this.$left = (<HTMLDivElement> e.target).scrollLeft;
	},

	oninit: function(n: MithrilVNode) {
		this.$view = new Viewport();
		this.$view.size = n.attrs.data.rows.length;
		window.addEventListener('resize', this.resize.bind(this, n.dom));
	},
	onbeforeupdate: function(n: MithrilVNode) {
		this.$view.size = n.attrs.data.rows.length;
		return true;
	},
	oncreate: function(n: MithrilVNode) {
		this.resize(n.dom);
		this.scroll(n.dom);
	},
	onupdate: function(n: MithrilVNode) { this.scroll(n.dom); },
	view: function(n: MithrilVNode) {
		var cols = (<DataSet> n.attrs.data).cols || [],
			rows = (<DataSet> n.attrs.data).rows;

		var view: Viewport = this.$view;
		var data = rows.slice(view.first, view.last);

		return m('div.table-panel',
			m('div.header-container',
				m('table.header',
					{ style: {'margin-left': (-this.$left || 0) + 'px'} },
					m('thead',
						m('tr.name', m('th', '#'), cols.map(col => m('th', {class: col[1]}, col[0])), m('th')),
						m('tr.type', m('td', ''), cols.map(col => m('td', {class: col[1]}, col[1])), m('td'))
					),
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
						data.map((row, i) => m('tr.row',
							{	key: i+view.first,
								class: (i+view.first) % 2 == 0 ? 'even' : 'odd'
							},
							m('td.int4', m('div', i+view.first+1)),
							row.map((col, j) => {
								var full = get_string(col, cols[j][1]);
								var lines = full.split('\n');
								return m('td', 
									{class: cols[j][1], title: full},
									m('div', lines.length > 1 ? m('span.more', '\u2026') : null, lines[0].trim()));
							}),
							m('td'))),
						m('tr.after', {style: {height: (view.after * this.$height) + 'px' } })
					)
				)
			)
		);
	}
};
