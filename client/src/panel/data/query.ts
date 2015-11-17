import Socket from '../../socket';
import Data from '../../data/query';
import Panel, {State, NodeList} from '../panel';

import Command from './command';

const MAX_PREVIEW = 30;

export default class Query extends Panel {
	private socket: Socket = null;
	name: string;
	cmd: string;
	private $cmd: Command;

	private data: Data;

	constructor(state: State) {
		super(state);
		this.cmd = state['cmd'];
		this.name = state['name'] || null;
		this.$cmd = new Command(state);
	}
	inherit(parent: NodeList, will: any) {
		super.inherit(parent, will);
		if (this.socket != will.socket) {
			this.socket = will.socket;
			this.data = new Data(this.socket, this.command);
			this.data.onchange = () => m.redraw();
			if (!this.dead()) { this.query(); }
		}
	}
	will() { return {socket: this.socket, data: this.data}; }
	dead() { return this.$close; }
	state() { return super.state().include(this.$cmd.state()).include({name: this.name, cmd: this.cmd}); }

	// model ///////////////////////////////////////////////////////////////////

	get plain() { return this.$cmd.plain; }
	get queryable() { return this.$cmd.completed; }
	get pending() { return this.data.pending; }
	get cancelled() { return this.data.cancelled; }
	get completed() { return this.data.completed; }

	get command() { return this.$cmd.cmd; }
	get preview() {
		if (this.name) { return this.name; }
		var lines = this.cmd.split('\n');
		var first = lines[0];
		if (first.length > MAX_PREVIEW || lines.length > 1) { first = first.substring(0, MAX_PREVIEW) + '...'; }
		return first;
	}

	get loadedRows() { return this.data.rows.length; }
	get totalRows() { return this.data.count; }

	// controller //////////////////////////////////////////////////////////////

	query() {
		if (this.dead()) { return; }
		if (!this.queryable) { return; }
		this.data.query(this.$cmd.param)
			.then(this.table.bind(this, true), this.fail.bind(this))
			.catch(console.log.bind(console, 'error'));
	}
	stop() { this.data.cancel(); }
	fail(msg: string) {
		if (this.plain) {
			this.error = msg;
			this.parent.change(this, {type: 'error', error: msg});
		}
		else { this.children.create({type: 'error', error: msg}); }
	}
	table(auto?: boolean) {
		if (auto && this.children.length != 0) { return; }
		this.children.create({type: 'visual/table'});
	}

	// view ////////////////////////////////////////////////////////////////////

	view() {
		if (!this.socket) { return super.view({tree: false}, Panel.toolbar(m('span.error', 'No connection to query.'), null)); }
		else if (!this.socket.granted) {
			return super.view({tree: false}, Panel.toolbar(
				[m('span.type', 'Query'), m('span.cmd', this.preview)],
				m('span.error', 'Not logged in.')
			));
		}
		else {
			return super.view({tree: !this.pending},
				Panel.toolbar([
					!this.pending && (this.cancelled || this.completed)
						? m('button', {onclick: this.query.bind(this), disabled: !this.queryable}, Panel.icon(this.plain ? 'e/cycle' : 'e/magnifying-glass'))
						: m('button', {onclick: this.stop.bind(this)}, Panel.icon('e/controller-stop')),
					m('span', {class: this.name ? 'name' : 'cmd'}, this.preview)
				], [
					m('span', this.loadedRows, ' / ', this.totalRows),
					m('button', {onclick: () => this.table()}, 'View Data'),
					m('button', {onclick: () => this.data.xlsx()}, 'Export')
				]),
				this.$cmd.view({onsubmit: (e: Event) => { e.preventDefault(); this.query(); }})
			);
		}
	}
}

Panel.register('data/query', Query);
