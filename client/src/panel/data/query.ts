import Socket from '../../socket';
import Data from '../../data/query';
import Panel, {State, NodeList} from '../panel';

const MAX_PREVIEW = 30;

export default class Query extends Panel {
	private socket: Socket = null;
	name: string;
	cmd: string;

	params: {[key: string]: any};
	private $parsed: string;
	private $order: string[];
	private $temp: {[key: string]: any};

	private data: Data;

	constructor(state: State) {
		super(state);
		this.cmd = state['cmd'];
		this.params = state['params'] || null;
		this.name = state['name'] || null;
		this.process();
	}
	inherit(parent: NodeList, will: any) {
		super.inherit(parent, will);
		if (this.socket != will.socket) {
			this.socket = will.socket;
			this.data = new Data(this.socket, this.$parsed);
			this.data.onchange = () => m.redraw();
			if (!this.dead()) { this.query(); }
		}
	}
	will() { return {socket: this.socket, data: this.data}; }
	dead() { return this.$close; }
	state() { return super.state().include({name: this.name, cmd: this.cmd, params: this.params}); }

	// model ///////////////////////////////////////////////////////////////////

	get pending() { return this.data.pending; }
	get cancelled() { return this.data.cancelled; }
	get completed() { return this.data.completed; }

	get preview() {
		if (this.name) { return this.name; }
		var lines = this.cmd.split('\n');
		var first = lines[0];
		if (first.length > MAX_PREVIEW || lines.length > 1) { first = first.substring(0, MAX_PREVIEW) + '...'; }
		return first;
	}

	get paramsPopulated() { return !this.params || Object.keys(this.params).every(key => !!this.params[key]); }

	get loadedRows() { return this.data.rows.length; }
	get totalRows() { return this.data.count; }

	// controller //////////////////////////////////////////////////////////////

	process() {
		try { eval('this._process`' + this.cmd + '`'); }
		catch (e) { window.setTimeout(() => { this.fail(e.toString()); m.redraw(); }, 0); }
	}
	private _process(cmds: string[], ...args: any[]) {
		if (cmds.length == 1) { this.$parsed = this.cmd; }
		else {
			let old = this.params || {};
			this.params = {};
			this.$order = args.map((arg: any) => {
				var key: string, val: any = null, init: boolean = true;
				if (typeof arg === 'string') { key = arg; }
				else {
					key = arg.key;
					val = arg.val.toString();
					init = arg.init;
				}

				// prefer value in the command string than saved data
				if (!init) { val = (old[key] !== undefined ? old[key] : val); }

				this.params[key] = val;
				return key;
			});

			this.$parsed = cmds[0];
			for (let i=0; i<this.$order.length; ++i) {
				this.$parsed += '%(' + this.$order[i] + ')s';
				this.$parsed += cmds[i+1];
			}
		}
	}
	update(key: string, value: any) { this.params[key] = value; }

	query() {
		if (this.dead()) { return; }
		if (this.params && !this.paramsPopulated) { return; }
		this.data.query(this.params)
			.then(this.table.bind(this, true), this.fail.bind(this))
			.catch(console.log.bind(console, 'error'));
	}
	stop() { this.data.cancel(); }
	fail(msg: string) {
		this.error = msg;
		this.parent.change(this, {type: 'error', error: msg});
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
						? (this.params
							? m('button', {onclick: this.query.bind(this), disabled: !this.paramsPopulated}, Panel.icon('e/magnifying-glass'))
							: m('button', {onclick: this.query.bind(this)}, Panel.icon('e/cycle')))
						: m('button', {onclick: this.stop.bind(this)}, Panel.icon('e/controller-stop')),
					m('span.cmd', this.preview)
				], [
					m('span', this.loadedRows, ' / ', this.totalRows),
					m('button', {onclick: () => this.table()}, 'View Data'),
					m('button', {onclick: () => this.data.xlsx()}, 'Export')
				]),
				!this.params ? null : m('form', {onsubmit: (e: Event) => { e.preventDefault(); this.query(); }},
					Object.keys(this.params).map(key =>
						m('span.param',
							m('label', {for: this.key + '-param-' + key}, key),
							m('input', {id: this.key + '-param-' + key, oninput: (e: Event) => this.update(key, (<HTMLInputElement> e.target).value), value: this.params[key]})
						)
					)
				)
			);
		}
	}
}

Panel.register('data/query', Query);
