import Socket, { Context } from './socket';
import DataSet, { ColumnDefinition } from './dataset';

type Transformer = { (val: string): any };

var transform: { [type: string]: Transformer } = {
	"_": (val: string) => val,
	numeric: (val: string) => val === null ? null : (val.length > 0 && parseFloat(val) || 0),
	date: (val: string) => val && new Date(val) || null,
	timestamptz: (val: string) => new Date(val),
};

export default class Query extends DataSet {
	name: string;
	command: string;
	params: any;

	context: Context;
	format: Array<Transformer> = [];

	private $time: [number, number] = [Date.now(), -1];
	private $status: number = -1;
	private $error: string = null;

	private $count: number = 0;
	private $buffer: number = 100;

	onchange: {(query: Query, msg: string): void} = (query: Query, msg: string) => {};

	constructor(socket: Socket, name: string, command: string, params?: any) {
		super([]);
		this.context = socket.acquire('__query' + this.key.toString());
		this.name = name || '';
		this.command = command || '';
		this.params = params || null;
		this.context.onstatus = this._status.bind(this);
	}
	get count() { return this.$count; }

	// timing
	get started() { return this.$time[0] >= 0; }
	get ended() { return this.$time[1] >= 0; }
	get elapsed() {
		if (!this.started) { return 0; }
		if (!this.ended) { return (Date.now() - this.$time[0]) / 1000; }
		return (this.$time[1] - this.$time[0]) / 1000;
	}

	// progress
	get cancelled() { return this.ended && this.$status < 0; }
	get waiting() { return this.$status == 1; }
	get executing() { return this.$status == 2; }
	get executed() { return this.$status == 3; }
	get progress() { return this.rows.length / this.count; }
	get completed() { return this.ended && this.$status == 0; }
	get failed() { return this.$error !== null; }

	// error handling
	get error() { return this.$error || ''; }

	query() {
		this.$time = [Date.now(), -1];
		this.$error = null;
		this.$status = 1;

		var p = this.context.query(this.command, this.params);
		p.then(this._process.bind(this)).then(this._retrieve.bind(this)).catch(this._fail.bind(this));
		return p;
	}
	cancel() {
		this._end(-1);
		this.context.cancel();

		window.setTimeout(() => this.onchange(this, 'cancel'), 0);
	}

	private _fail(msg: string) {
		if (!this.cancelled) {
			this._end(-1);
			this.$error = msg;
			window.setTimeout(() => this.onchange(this, 'error'), 0);
		}
	}
	private _process(meta: [number, ColumnDefinition[]]) {
		this.$status = 3;
		this.$count = meta[0];
		this.meta(meta[1]);
		this.format = meta[1].map(m => transform[m[1]] || transform['_']);

		window.setTimeout(() => this.onchange(this, 'process'), 0);
	}
	private _retrieve() {
		if (this.cancelled) { return; }
		if (this.rows.length < this.count) {
			var p = this.context.data(this.$buffer);
			p.catch(this.query.bind(this));

			p.then(this._data.bind(this, Date.now()))
				.then(this._retrieve.bind(this))
				.catch(console.log.bind(console));
		}
		else if (!this.ended) { this._end(0); }
	}
	private _data(start: number, rows: any[][]) {
		if (this.cancelled) { return; }
		super.insert(rows.map(row => row.map((v: string, i: number) => this.format[i](v))));

		// revise the loading buffer
		var wait = (Date.now() - start) / 1000;
		this.$buffer = Math.min(Math.max(100, Math.floor(this.$buffer * 0.3 + rows.length / wait / 2 * 0.7)), 400000);

		// trigger events
		window.setTimeout(() => this.onchange(this, 'data'), 0);
	}
	private _end(status: number) {
		this.$status = status;
		this.$time[1] = Date.now();
	}

	private _status() {
		this.$status = this.context.status || 0;
		window.setTimeout(() => this.onchange(this, 'status'), 0);
	}
}
