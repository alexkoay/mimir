import Data from '../../data/basic';
import Panel, {State, NodeList} from '../panel';

export function get_string(val: any, type: string): string {
	if (val === null) { return ''; }
	else if (moment.isMoment(val)) {
		if (type === 'date') { return val.format('Do MMM YYYY'); }
		else { return val.format('Do MMM YYYY, HH:mm:ss').replace('T', ' '); }
	}
	else if (moment.isDuration(val)) {
		if (type === 'interval') { return moment().add(val).fromNow(); }
		else { return val.toString(); }
	}
	else { return val.toString(); }
}

export default class Table extends Panel {
	private $data: Data;

	offset: number = 0;

	private $count: number = 10;
	private $header: number = null;
	private $height: number = null;
	private $scroll: boolean = false;

	constructor(state: State) {
		super(state);
		this.$minimize = false;
	}
	inherit(parent: NodeList, will: any): void {
		super.inherit(parent, will);
		this.$data = will.data;
		// this.offset = 0;
		// this.$scroll = true;
	}
	will() { return {data: this.$data}; }
	state() { return super.state().include({}); }

	// model ///////////////////////////////////////////////////////////////////

	get renderFirst() { return Math.max(this.viewFirst - 5, 0); }
	get viewFirst() { return this.offset; }
	get viewLast() { return Math.min(this.offset + this.$count, this.$data.rows.length); }
	get renderLast() { return Math.min(this.viewLast + 5, this.$data.rows.length); }

	// controller //////////////////////////////////////////////////////////////

	measure(el: HTMLElement) {
		if (this.$data.rows.length == 0 || this.$data.cols.length == 0) { return; }

		var row = el.querySelector('table.sticky thead');
		if (row) {
			var style = window.getComputedStyle(row);
			this.$header = parseFloat(style.height);
		}

		row = el.querySelector('table.data tbody tr.row');
		if (row) {
			style = window.getComputedStyle(row);
			this.$height = parseFloat(style.height);
		}

		var count = Math.ceil(el.clientHeight / this.$height) || 10;
		if (this.$count != count) { this.$count = count; m.redraw(); }
	}
	autowidth(el: HTMLElement) {
		var src = el.querySelectorAll('table.data th');
		var dst = el.querySelectorAll('table.sticky th');
		for (var i=0; i<src.length; ++i) {
			let style = window.getComputedStyle(<Element> src[i]);
			(<HTMLElement> dst[i]).style.width = style.width;
		}
	}
	scroll(el: HTMLElement) {
		this.offset = Math.max(Math.floor((el.scrollTop - this.$header) / this.$height) || 0, 0);
		this.$count = Math.ceil(el.clientHeight / (this.$height || 10)) || 10;
		(<HTMLElement> el.querySelector('table.sticky')).style.top = el.scrollTop + "px";
	}

	// view ////////////////////////////////////////////////////////////////////

	config(el: HTMLElement, isInit: boolean) {
		if (!this.$header || !this.$height) { this.measure(el); }
		this.autowidth(el);
		if (this.$scroll) {
			this.scroll(el);
			this.$scroll = false;
		}
	}

	view() {
		var cols = this.$data.cols || [], rows = this.$data.rows;
		var data = rows.slice(this.renderFirst, this.renderLast);

		var header = m('thead',
			m('tr.name', cols.map(col => m('th', {class: col[1]}, col[0])), m('th')),
			m('tr.type', cols.map(col => m('td', {class: col[1]}, col[1])))
		);
		var body = m('tbody',
			m('tr.before', {style: 'height:' + (this.renderFirst * this.$height) + 'px'}),
			data.map((row, i) => m('tr.row',
				{class: ((i+this.renderFirst) % 2 == 0) ? 'even' : 'odd'},
				row.map((col, j) => {
					var full = get_string(col, cols[j][1]);
					var lines = full.split('\n');
					return m('td',
						{class: cols[j][1], title: full},
						m('div', lines.length > 1 ? m('span.more', '\u2026') : null, lines[0].trim()));
				}),
				m('td'))),
			m('tr.after', {style: 'height:' + ((rows.length - this.renderLast) * this.$height) + 'px'})
		);

		var pluralise = (num: number, dim: string) => num == 0 ? ('no ' + dim + 's') : (num + ' ' + dim + (num > 1 ? 's' : ''));

		var min = (this.$minimize || cols.length == 0 || rows.length == 0);
		return super.view(null,
			!min ? null
				: Panel.toolbar(m('span', m('span.type', 'Table'), ' with ', pluralise(rows.length, 'row'), ' and ', pluralise(cols.length, 'column'), '.')),
			m('div.container',
				{class: min ? 'hide' : '', onscroll: (e: UIEvent) => this.scroll(<HTMLElement> e.target), config: this.config.bind(this)},
				m('table.sticky', header),
				m('table.data', header, body)
			));
	}
}

Panel.register('visual/table', Table);