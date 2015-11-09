import Socket from '../../socket';
import Node from '../node';
import Panel from '../styled';

export default class Query extends Panel {
	private socket: Socket;
	private cmd: string;
	private name: string;
	private auto: boolean;
	private error: string;

	private cancel: boolean = false;

	private count: number = 0;
	private cols: [string, string][] = null;
	private result: any[][] = [];
	private rows: any[][] = this.result;

	private buffer: number = 100;

	constructor(node: Node, parent: any, state: any) {
		super(node, parent, state);

		this.$minimize = null;
		this.cmd = state.cmd;
		this.name = state.name || null;
		this.error = state.error || null;
		this.auto = state.auto || false;
		if (this.error) { this.node.deleteSelf(); }
		else { this.query().catch((): any => {}); }
	}
	useParent(parent: any) { super.useParent(parent); this.socket = parent.socket; }

	args(...more: any[]): any { return super.args(...more, {cols: () => this.cols, rows: () => this.rows}); }
	get data(): any { return {cmd: this.cmd, name: this.name, error: this.error}; }
	get isError() { return !!this.error; }

	get preview() {
		if (this.name) { return this.name; }
		var lines = this.cmd.split('\n');
		var first = lines[0];
		if (first.length > 30 || lines.length > 1) { first = first.substring(0, 30) + '...'; }
		return first;
	}
	get complete() { return this.count <= this.result.length; }

	close() { super.close(true); }
	query() {
		if (this.node.dead || this.error) { return; }
		this.cancel = false;
		this.count = 0;
		return new Promise((ok: any, fail: {(): any}) => {
			var p = this.socket.query(this.cmd);
			p.then(this._process.bind(this))
				.then(this._retrieve.bind(this))
				.catch((msg: string): any => this.fail(msg));
			p.catch(fail);
		});
	}
	fail(msg: string) {
		this.cancel = true;
		this.error = msg;
		m.redraw();
	}
	private _retrieve() {
		if (this.cancel) { return; }
		if (!this.complete) {
			var p = this.socket.data(this.buffer);
			var now = new Date().getTime();
			p.then((data: any[][]) => this._data(now, data))
				.then(this._retrieve.bind(this))
				.catch(console.log.bind(console));
			p.catch(this.query.bind(this));
		}
	}
	private _process(meta: [number, [string, string][]]) {
		this.count = meta[0];
		this.cols = meta[1];
		this.result.splice(0, this.result.length);
		if (this.auto && this.cols.length > 0 && this.node.numChildren == 0) { this.viewdata(); }
		m.redraw();
	}
	private _data(start: number, rows: any[][]) {
		if (this.cancel) { return; }
		this.result = this.result.concat(rows);
		this.rows = this.result;

		// revise the loading buffer
		var wait: number = (new Date().getTime() - start) / 1000;
		this.buffer = Math.min(Math.max(100, Math.floor(this.buffer * 0.3 + rows.length / wait / 2 * 0.7)), 400000);
		m.redraw();
	}

	viewdata() {
		this.node.insertNewChild('visual/table', null);
	}

	view(): MithrilVirtualElement {
		if (this.error) { return super.view({view: m('samp.error', this.error)}); }
		return super.view({
			toolbar: {left: [
				this.count != 0 && (this.cancel || this.complete)
					? m('button', {onclick: this.query.bind(this)}, Panel.icon('cycle', 'Cycle'))
					: m('button', {onclick: () => this.cancel = true}, Panel.icon('controller-stop', 'Stop')),
				m('span.cmd', this.preview)
			],
			right: [
				m('span', this.rows.length, ' / ', this.count),
				m('button', {onclick: this.viewdata.bind(this)}, 'View Data')
			]}
		});
	}
}

Panel.register('query', Query);