import Node, {State} from '../node';
import Panel from '../styled';

export default class Load extends Panel {
	private item: string;
	private states: {[id: string]: State};

	private selected: string = null;

	constructor(node: Node, parent: any, state: any) {
		super(node, parent, state);

		state = state || {};
		this.$minimize = null;
		this.item = state.item || 'reports';
		this.states = state.states || {};
		if (state.init) { this.node.deleteSelf(); }
	}
	get data() { return {init: true}; }

	list(): string[] {
		return Object.keys(this.states).sort();
	}

	select(key: string) {
		if (this.selected == key) { this.selected = null; }
		else { this.selected = key; }
	}
	load() {
		if (this.selected) {
			this.node.replaceWithState(this.states[this.selected]);
		}
	}

	view(): MithrilVirtualElement {
		var list = this.list();
		return super.view({
			class: 'listing',
			view: m('ul', list.length > 0
				? [list.map((key: string) => m('li', {key: key, class: key == this.selected ? 'selected' : '', onclick: () => this.select(key)}, key)), m('li.empty', 'End of list.')]
				: m('li.empty', 'No ', this.item, '.')
			),
			toolbar: {
				left: [
					m('button', {onclick: this.load.bind(this), disabled: this.selected === null}, 'Load')
				]
			}
		});
	}
}

Panel.register('report/load', Load);