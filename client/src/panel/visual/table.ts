import Node from '../node';
import Panel from '../styled';

export function get_string(val: any, type: string) {
	if (val === null) { return ''; }
	//else if (moment.isMoment(val)) { return val.format('Do MMM YYYY, HH:mm:ss').replace('T', ' '); }
	/*else if (moment.isDuration(val)) {
		if (type === 'interval') { return val.humanize(); }
		else { return val.toString(); }
	}*/
	else { return val.toString(); }
}

export default class Table extends Panel {
	private cols: () => [string, string][];
	private rows: () => any[][];

	private offset: number = 0;
	private count: number = 10;
	private header: number = null;
	private height: number = null;

	useParent(parent: any) {
		this.cols = parent.cols;
		this.rows = parent.rows;
		this.offset = 0;
	}
	get data(): any { return null; }

	get renderFirst() { return Math.max(this.viewFirst - 5, 0); }
	get viewFirst() { return this.offset; }
	get viewLast() { return Math.min(this.offset + this.count, this.rows().length); }
	get renderLast() { return Math.min(this.viewLast + 5, this.rows().length); }

	config(el: HTMLElement, isInit: boolean) {
		var calc = false;
		if (!this.header) {
			let row = el.querySelector('thead');
			if (!row) { return; }
			let style = window.getComputedStyle(row);
			this.header = parseFloat(style.height);
		}
		if (!this.height) {
			let row = el.querySelector('tbody tr.row');
			if (!row) { return; }
			let style = window.getComputedStyle(row);
			this.height = parseFloat(style.height);
			m.redraw();
		}
	}

	scroll(e: UIEvent) {
		var el = <HTMLElement> e.target;
		this.offset = Math.max(Math.floor((el.scrollTop - this.header)/this.height) || 0, 0);
		this.count = Math.ceil(el.clientHeight / this.height) || 10;
	}

	view(): MithrilVirtualElement {
		var cols = this.cols() || [], rows = this.rows();
		var data = rows.slice(this.renderFirst, this.renderLast);
		return super.view({
			view: m('div.container',
				{class: this.$minimize ? 'hide' : '', onscroll: this.scroll.bind(this), config: this.config.bind(this)},
				m('table',
					m('thead',
						m('tr.name', cols.map(col => m('th', {class: col[1]}, col[0])), m('th')),
						m('tr.type', cols.map(col => m('td', {class: col[1]}, col[1])))
					),
					m('tbody',
						m('tr.before', {style: 'height:' + (this.renderFirst * this.height) + 'px'}),
						data.map((row, i) =>
							m('tr.row',
								{class: ((i+this.renderFirst) % 2 == 0) ? 'even' : 'odd'},
								row.map((col, j) => {
									var str = get_string(col, cols[j][1]);
									var lines = str.split('\n');

									return m('td',
										{class: cols[j][1], title: str},
										m('div', lines.length > 1 ? m('span.more', '\u2026') : null, lines[0]));
								}), m('td'))),
						m('tr.after', {style: 'height:' + ((rows.length - this.renderLast) * this.height) + 'px'})
					)
				)
			),
			toolbar: this.$minimize ? {left: [m('span', m('span.type', 'Table'), ' with ', rows.length, ' row(s).')]} : null
		});
	}
}

Panel.register('visual/table', Table);