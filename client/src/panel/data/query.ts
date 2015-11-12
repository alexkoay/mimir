import Socket from '../../socket';
import Data from '../../data/query';
import Node from '../node';
import Panel from '../styled';

export default class Query extends Panel {
	private socket: Socket;
	private cmd: string;

	private name: string;
	private auto: boolean;
	private error: string;

	private $data: Data;

	constructor(node: Node, parent: any, state: any) {
		super(node, parent, state);

		this.$minimize = null;
		this.socket = parent.socket;
		this.cmd = state.cmd;

		this.$data = new Data(this.socket, this.cmd);
		this.$data.onchange = () => m.redraw();

		this.name = state.name || null;
		this.error = state.error || null;
		this.auto = state.auto || false;

		if (this.error) { this.node.deleteSelf(); }
		else { this.query(); }
	}
	useParent(parent: any) { super.useParent(parent); this.socket = parent.socket; }

	args(...more: any[]): any { return super.args(...more, {cols: () => this.$data.cols, rows: () => this.$data.rows}); }
	get data(): any { return {cmd: this.cmd, name: this.name, error: this.error}; }
	get isError() { return !!this.error; }

	get preview() {
		if (this.name) { return this.name; }
		var lines = this.cmd.split('\n');
		var first = lines[0];
		if (first.length > 30 || lines.length > 1) { first = first.substring(0, 30) + '...'; }
		return first;
	}

	get cancelled() { return this.$data.cancelled; }
	get completed() { return this.$data.completed; }

	close() { super.close(true); }
	query() {
		if (this.node.dead || this.error) { return; }
		var p = this.$data.query();
		p.catch((msg: string): any => this.fail(msg));
		if (this.auto) { p.then(this.viewdata.bind(this)); }
	}
	fail(msg: string) {
		this.error = msg;
		m.redraw();
	}

	viewdata(auto?: boolean) {
		if (!auto || this.node.numChildren == 0) { this.node.insertNewChild('visual/table', null); }
	}

	view(): MithrilVirtualElement {
		if (this.error) { return super.view({view: m('samp.error', this.error)}); }
		return super.view({
			toolbar: {left: [
				!this.$data.pending && (this.$data.cancelled || this.$data.completed)
					? m('button', {onclick: this.query.bind(this)}, Panel.icon('cycle', 'Cycle'))
					: m('button', {onclick: () => this.$data.cancel() }, Panel.icon('controller-stop', 'Stop')),
				m('span.cmd', this.preview)
			],
			right: [
				m('span', this.$data.rows.length, ' / ', this.$data.count),
				m('button', {onclick: () => this.viewdata()}, 'View Data')
			]}
		});
	}
}

Panel.register('data/query', Query);
