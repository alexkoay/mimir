import Data from '../../data/basic';
import Panel, {State, NodeList} from '../panel';

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
	private $data: Data;

	offset: number = 0;
	private $count: number = 10;
	private $header: number = null;
	private $height: number = null;

	constructor(state: State) {
		super(state);
		this.$minimize = false;
	}
	inherit(parent: NodeList, will: any): void {
		super.inherit(parent, will);
		this.$data = will.data;
	}
	will() { return {data: this.$data}; }
	state() { return super.state().include({}); }

	// model ///////////////////////////////////////////////////////////////////

	get renderFirst() { return Math.max(this.viewFirst - 5, 0); }
	get viewFirst() { return this.offset; }
	get viewLast() { return Math.min(this.offset + this.$count, this.$data.rows.length); }
	get renderLast() { return Math.min(this.viewLast + 5, this.$data.rows.length); }

	// controller //////////////////////////////////////////////////////////////

	scroll(e: UIEvent) {
		var el = <HTMLElement> e.target;
		this.offset = Math.max(Math.floor((el.scrollTop - this.$header) / this.$height) || 0, 0);
		this.$count = Math.ceil(el.clientHeight / this.$height) || 10;
	}

	// view ////////////////////////////////////////////////////////////////////

	config(el: HTMLElement, isInit: boolean) {
		if (!this.$header) {
			let row = el.querySelector('thead');
			if (!row) { return; }
			let style = window.getComputedStyle(row);
			this.$header = parseFloat(style.height);
		}
		if (!this.$height) {
			let row = el.querySelector('tbody tr.row');
			if (!row) { return; }
			let style = window.getComputedStyle(row);
			this.$height = parseFloat(style.height);
			m.redraw();
		}
		if (!isInit && this.offset > 0) { el.scrollTop = this.$height * this.offset; }
	}
	view() {
		var cols = this.$data.cols || [], rows = this.$data.rows;
		var data = rows.slice(this.renderFirst, this.renderLast);
		return super.view(null, [
			m('div.container',
				{class: this.$minimize ? 'hide' : '', onscroll: this.scroll.bind(this), config: this.config.bind(this)},
				cols.length == 0 || rows.length == 0 ? null : m('table',
					m('thead',
						m('tr.name', cols.map(col => m('th', {class: col[1]}, col[0])), m('th')),
						m('tr.type', cols.map(col => m('td', {class: col[1]}, col[1])))),
					m('tbody',
						m('tr.before', {style: 'height:' + (this.renderFirst * this.$height) + 'px'}),
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
						m('tr.after', {style: 'height:' + ((rows.length - this.renderLast) * this.$height) + 'px'})
					)
				)
			),
			!(this.$minimize || cols.length == 0 || rows.length == 0) ? null
				: Panel.toolbar(
					m('span', m('span.type', 'Table'), ' with ',
						(rows.length == 0 ? 'no rows' : rows.length == 1 ? '1 row' : (rows.length + ' rows')),
						' and ', (cols.length == 0 ? 'no columns' : cols.length == 1 ? '1 column' : (cols.length + ' columns')),
						'.'
					),
					null)
		]);
	}
}

Panel.register('visual/table', Table);