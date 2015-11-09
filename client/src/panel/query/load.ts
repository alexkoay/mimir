import Node from '../node';
import Panel from '../styled';

export default class Load extends Panel {
	private cmd: string;
	private auto: boolean;
	private wait: number;

	private selected: string = null;
	private confirm: string = null;

	constructor(node: Node, parent: any, state: any) {
		super(node, parent, state);

		state = state || {};
		this.$minimize = null;
		this.cmd = state.cmd || '';
		this.auto = state.auto || false;
		this.wait = state.wait || 1.0;
	}
	get data(): any { return {cmd: this.cmd, auto: this.auto, wait: this.wait}; }

	list(): string[] {
		return Object.keys(window.localStorage)
			.filter((key: string) => key.startsWith('query/'))
			.map((key: string) => key.substring(6))
			.sort();
	}
	preview() { return window.localStorage.getItem('query/' + this.selected); }
	cancel() { this.transform('query/editor'); }

	select(key: string) {
		this.confirm = null;
		if (this.selected == key) { this.selected = null; }
		else { this.selected = key; }
	}
	load() {
		if (this.cmd !== '' && this.confirm != 'load') { this.confirm = 'load'; }
		else {
			this.confirm = null;
			if (this.selected) {
				var item = this.preview();
				if (item) {
					this.cmd = item;
					this.transform('query/editor');
				}
			}
		}
	}
	delete(key: string) {
		if (this.confirm != 'delete') { this.confirm = 'delete'; }
		else {
			if (this.selected) { window.localStorage.removeItem('query/' + this.selected); }
			this.confirm = null;
			this.selected = null;
		}
	}

	view(): MithrilVirtualElement {
		var list = this.list();
		return super.view({
			view: m('div',
				m('ul', list.length > 0
					? [list.map((key: string) => m('li', {key: key, class: key == this.selected ? 'selected' : '', onclick: () => this.select(key)}, key)), m('li.empty', 'End of list.')]
					: m('li.empty', 'No saved queries.')
				),
				this.selected === null ? null : m('pre.preview', this.preview())
			),
			toolbar: {
				left: [
					m('button.ok', {onclick: this.load.bind(this), disabled: this.confirm == 'load' || this.selected === null}, 'Load'),
					this.confirm != 'load' ? null : m('button.ok', {onclick: this.load.bind(this), disabled: this.selected === null}, 'Confirm'),
					m('button.cancel', {onclick: this.cancel.bind(this)}, 'Cancel'),
				],
				right: [
					this.confirm != 'delete' ? null : m('button.cancel', {onclick: this.delete.bind(this), disabled: this.selected === null}, 'Confirm'),
					m('button.cancel', {onclick: this.delete.bind(this), disabled: this.confirm == 'delete' || this.selected === null}, 'Delete')
				]
			}
		});
	}
}

Panel.register('query/load', Load);