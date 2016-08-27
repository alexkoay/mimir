import isEmpty from 'lodash/isEmpty';
import Timer from './timer';
import Socket from './socket';

type SendFunction = { (cmd: string, args: string): void };
type ReleaseFunction = { (): void };
type QueryData = {cmd: string, args: string};
type QueryReturn = { ok: {(data: any): void}, fail: {(err: any): void} };
type QueryStatus = { status?: number, total?: number, fetch?: number };
type ErrorHandler = { (message: string): void };
type StatusHandler = { (status: QueryStatus): void };

export default class Context {
	private $open: boolean = true;

	private $socket: Socket; 
	private $token: string;
	private $send: SendFunction;
	private $release: ReleaseFunction;

	private $query: QueryData = null;
	private $query_p: QueryReturn = null;
	private $timer: Timer = new Timer(this.refresh.bind(this));

	private $status: QueryStatus = { };
	private $cache: any = null;

	onerror: ErrorHandler = (m => {});
	onstatus: StatusHandler = (s => {});

	constructor(socket: Socket, token: string, send: SendFunction, release: ReleaseFunction) {
		this.$socket = socket;
		this.$token = token;
		this.$send = send;
		this.$release = release;
	}

// properties //////////////////////////////////////////////////////////////////

	get ready() { return this.$query_p === null; }
	get status() { return this.$status.status || 0; }
	get cache() { return this.$cache; }

// methods /////////////////////////////////////////////////////////////////////

	// destroy context
	release() {
		this.cancel();
		this.$open = false;
		this.$send = null;
		this.$release();
	}

	// 
	retry() {
		if (this.$query === null) { return; }
		this.$send(this.$query.cmd, this.$query.args);
	}
	cancel() {
		this.$send('-', '');
		this.$query = null;
	}

	// queries
	raw(cmd: string, args: string | any) {
		if (!this.$open) { throw 'Token already released'; }
		if (this.$query !== null) { throw 'Already running another query'; }
		if (typeof args === 'object' && !(args instanceof String)) { args = JSON.stringify(args); }

		this.$timer.repeat(5);
		var p = new Promise((ok, fail) => {
			this.$query = {cmd, args};
			this.$query_p = {ok, fail};
			this.$send(cmd, args);
		})
		p.then((data: any) => {
			this.$status = { };
			this.$cache = data;
		});
		return p;
	}
	list() { return this.raw('#', ''); }
	schema(table: string) { return this.raw('$', table); }
	query(command: string, params?: any[] | {[key: string]: any}) { return this.raw('?', isEmpty(params) ? command : [command, params]); }
	data(num: number) { return this.raw('+', num.toString()); }

	// get status
	refresh() {
		if (this.$query_p === null) { return; }
		this.$send('=', '');
	}

// handlers ////////////////////////////////////////////////////////////////////

	receive(cmd: string, error: boolean, data: any) {
		switch (cmd) {
			case '=':
				window.setTimeout(this.onstatus.bind(this, data), 0);
				this.$status = data[this.$token];
				break;
			default:
				window.setTimeout((error ? this.$query_p.fail : this.$query_p.ok).bind(this, data), 0);
				this.$query = null;
				this.$query_p = null;
				this.$timer.cancel();
				break;
		}
	}
}
