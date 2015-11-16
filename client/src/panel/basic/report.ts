import Panel, {State, NodeList} from '../panel';

export default class Report extends Panel {
	items: {[id: string]: State};
	private selected: string = null;

	constructor(state: State) {
		super(state);
		this.items = state['items'] || {};
	}
	state() { return super.state().include({close: true}); }

	// model ///////////////////////////////////////////////////////////////////

	get keys(): string[] { return Object.keys(this.items).sort(); }

	// controller //////////////////////////////////////////////////////////////

	select(key: string) {
		if (this.selected == key) { this.selected = null; }
		else { this.selected = key; }
	}
	load() {
		if (this.selected) { this.parent.change(this, this.items[this.selected]); }
	}

	// view ////////////////////////////////////////////////////////////////////

	view() {
		var list = this.keys;
		return super.view({class: 'listing'},
			Panel.toolbar(m('button', {onclick: this.load.bind(this), disabled: this.selected === null}, 'Load'), null),
			m('ul', list.length > 0
				? [list.map((key: string) => m('li', {key: key, class: key == this.selected ? 'selected' : '', onclick: () => this.select(key)}, key)), m('li.empty', 'End of list.')]
				: m('li.empty', 'No reports found.')
			)
		);
	}
}

Panel.register('report/load', Report);