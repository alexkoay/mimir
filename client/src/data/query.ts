import Socket from '../socket';
import Basic from './basic';

export default class Query extends Basic {
	private socket: Socket;
	private cmd: string;

	private $pending: boolean = false;
	private $cancel: boolean = false;
	private $count: number = 0;

	private buffer: number = 100;

	onchange: {(query: Query): void} = (query: Query) => {};

	constructor(socket: Socket, command: string) {
		super([]);
		this.socket = socket;
		this.cmd = command || '';
	}
	get count() { return this.$count; }

	get ready() { return this.socket.ready; }
	get pending() { return this.$pending; }
	get progress() { return this.rows.length / this.count; }
	get completed() { return this.rows.length >= this.count; }
	get cancelled() { return this.$cancel; }

	cancel() { this.$cancel = true; }
	query(params?: any) {
		this.$cancel = false;
		this.$pending = true;

		var p = this.socket.query(this.cmd, params);
		p.then(this._process.bind(this)).then(this._retrieve.bind(this)).catch(this._fail.bind(this));
		return p;
	}
	private _fail(msg: string) { this.$pending = false; }
	private _retrieve() {
		if (this.$cancel) { return; }
		if (this.count > this.rows.length) {
			var p = this.socket.data(this.buffer);
			p.then(this._data.bind(this, new Date().getTime()))
				.then(this._retrieve.bind(this))
				.catch(console.log.bind(console));
			p.catch(this.query.bind(this));
		}
	}
	private _process(meta: [number, [string, string][]]) {
		this.$pending = false;
		this.$count = meta[0];
		super.meta(meta[1]);
		this.onchange(this);
	}
	private _data(start: number, rows: any[][]) {
		if (this.$cancel) { return; }
		super.insert(rows);

		// revise the loading buffer
		var wait = (new Date().getTime() - start) / 1000;
		this.buffer = Math.min(Math.max(100, Math.floor(this.buffer * 0.3 + rows.length / wait / 2 * 0.7)), 400000);

		// trigger events
		this.onchange(this);
	}
}
