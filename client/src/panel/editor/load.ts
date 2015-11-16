import Socket from '../../socket';
import Query from '../data/query';
import Panel, {State, NodeList} from '../panel';

export default class Load extends Panel {
	private socket: Socket;
	query: State;

	private selected: string = null;
	private confirm: string = null;

	constructor(state: State) {
		super(state);
		this.query = state;
	}
	inherit(parent: NodeList, will: any) {
		super.inherit(parent, will);
		this.socket = will.socket;
	}
	will() { return {socket: this.socket}; }
	state() { return super.state().include(this.query); }
	toJSON() { return super.toJSON().exclude('last'); }
	close() { this.parent.delete(this, false); return this; }

	// model ///////////////////////////////////////////////////////////////////

	get list(): string[] {
		return Object.keys(window.localStorage)
			.filter((key: string) => key.startsWith('query/'))
			.map((key: string) => key.substring(6))
			.sort();
	}
	get preview() { return window.localStorage.getItem('query/' + this.selected) || ''; }

	// controller //////////////////////////////////////////////////////////////

	cancel() { this.parent.change(this, 'editor'); }
	select(key: string) {
		this.confirm = null;
		this.selected = this.selected == key ? null : key;
	}
	load() {
		if (this.query['cmd'] && this.confirm != 'load') { this.confirm = 'load'; }
		else {
			this.confirm = null;
			if (this.selected) {
				this.query['cmd'] = this.preview;
				this.cancel();
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

	// view ////////////////////////////////////////////////////////////////////

	view() {
		var list = this.list;
		return super.view(
			{class: 'listing'},
			m('div',
				m('ul', list.length > 0
					? [list.map((key: string) => m('li', {key: key, class: key == this.selected ? 'selected' : '', onclick: () => this.select(key)}, key)), m('li.empty', 'End of list.')]
					: m('li.empty', 'No saved queries.')
				),
				this.selected === null ? null : m('pre.preview', this.preview)
			),
			Panel.toolbar([
				m('button.ok', {onclick: this.load.bind(this), disabled: this.confirm == 'load' || this.selected === null}, 'Load'),
				this.confirm != 'load' ? null : m('button.ok', {onclick: this.load.bind(this), disabled: this.selected === null}, 'Confirm'),
				m('button.cancel', {onclick: this.cancel.bind(this)}, 'Cancel'),
			], [
				this.confirm != 'delete' ? null : m('button.cancel', {onclick: this.delete.bind(this), disabled: this.selected === null}, 'Confirm'),
				m('button.cancel', {onclick: this.delete.bind(this), disabled: this.confirm == 'delete' || this.selected === null}, 'Delete')
			])
		);
	}
}

Panel.register('editor/load', Load);