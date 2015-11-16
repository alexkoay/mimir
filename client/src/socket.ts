
var fib: number[] = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];

type LoginPromise = { ok: {(): void}, fail: {(err: string): void} };
type QueryPromise = { ok: {(...args: any[]): void}, fail: {(...args: any[]): void} };

interface Command { query: string; promise: QueryPromise; }

export default class Socket {
	private $debug: boolean;
	private $url: string;

	// websocket
	private $conn: WebSocket = null;
	private $status: string = '';
	private $reconnect: number = 0;

	// authentication
	private $auth: {response: {(): void}, promise: LoginPromise} = null;
	private $granted: boolean = false;
	private $user: string = null;

	// command queue
	private $pending: number = 0;
	private $current: Command = null;
	private $queue: Command[] = [];

	// events
	onchange: {(type: string): void} = (type: string) => {};

	constructor(url: string, debug?: boolean) {
		this.$debug = debug || false;
		this.$url = url;
	}
	static component(): any { return {controller: (args: any) => new SocketCtrl(args), view: SocketView}; }

// properties ////////////////////////////////////////////////////////////////

	get status(): string { return this.$status; }
	get connected(): boolean { return (this.$conn && this.$conn.readyState === 1) || false; }
	get ready(): boolean { return this.$pending === 0; }
	get pending(): number { return this.$pending; }
	get granted(): boolean { return this.$granted; }
	get user(): string { return this.$granted ? this.$user : null; }

// methods ///////////////////////////////////////////////////////////////////

	autologin(): Promise<void> {
		var auto: string = window.localStorage.getItem('autologin');
		if (auto) {
			var args: string[] = JSON.parse(auto);
			return this._login(args[0], args[1]);
		}
		else { return new Promise<void>((ok, fail) => fail('No autologin credentials')); }
	}
	login(user: string, password: string, auto: boolean): Promise<void> {
		var p = this._login(user, password);
		if (auto) { p.then(() => window.localStorage.setItem('autologin', JSON.stringify([user, password]))); }
		return p;
	}
	private _login(user: string, password: string): Promise<void> {
		return new Promise<void>((ok, fail) => {
			if (this.user === user) { ok(); }
			else if (this.$auth && this.$auth.promise) { this.$auth.promise.fail('Trying to login'); }
			else {
				this.$user = user;
				this.$auth = {
					response: () => { this.send(user); this.send(password); },
					promise: { ok: ok, fail: fail }
				};
				if (this.granted) { this.$conn.close(); }
				else { this._flush(); }
			}
		});
	}
	logout() {
		this.$auth = null;
		window.localStorage.removeItem('autologin');
		this.connect(true);
	}

	send(data: string) {
		if (this.$debug) { console.log('send:', data.slice(0, 30)); }
		if (this.$conn.readyState === 1) {
			this.$pending++;
			this.$conn.send(data);
		}
	}
	cmd(query: string): Promise<any> {
		return new Promise((ok, fail) => {
			this.$queue.push({ query: query, promise: { ok: ok, fail: fail } });
			this._flush();
		});
	}
	list(): Promise<string[]> { return this.cmd('#'); }
	schema(table: string): Promise<string[]> { return this.cmd('$' + table); }
	query(query: string, param?: any[]): Promise<[number, [string, string][]]> {
		if (param) { query = JSON.stringify([query, param]); }
		return this.cmd('?' + query);
	}

	data(num: number): Promise<any[][]> {
		return new Promise((ok, fail) => {
			if (!this.$current) { fail(); }
			else {
				this.$current = { query: '+' + String(num || ''), promise: { ok: ok, fail: fail } };
				this._flush();
			}
		});
	}
	done() {
		if (this.$current && this.$current.query === null) {
			this.$current = null;
			this.send('*');
		}
	}

// handlers //////////////////////////////////////////////////////////////////

	_onopen() {
		this.$reconnect = 0;
		this.$granted = false;
		this.status = 'Connected.';
	}
	_onclose() {
		var delay: number = Math.random() * fib[Math.min(this.$reconnect, fib.length - 1)];
		this.status = 'Reconnecting in ' + Math.ceil(delay) + ' seconds... (#' + (++this.$reconnect) + ')';
		window.setTimeout(this.connect.bind(this), delay * 1000);
	}
	_onmessage(msg: {data: any; type: string; target: WebSocket}) {
		if (this.$debug) { console.log('recv:', msg.data.slice(0, 30)); }
		this._process(msg.data[0], msg.data.slice(1));
	}

// internal //////////////////////////////////////////////////////////////////

	set status(val: string) { this.$status = val; this.onchange('status'); }
	set granted(val: boolean) { this.$granted = !!val; this.onchange('granted'); }
	set pending(num: number) { this.$pending = num; this.onchange('ready'); }

	connect(force?: boolean): Socket {
		if (this.connected && !force) { return; }
		this.status = 'Connecting...';

		// clear state
		this.pending = 1;

		// remove old connections
		if (this.$conn) {
			this.$conn.onclose = () => {};
			this.$conn.close();
		}

		// connect websocket
		this.$conn = new WebSocket(this.$url);
		this.$conn.onopen = this._onopen.bind(this);
		this.$conn.onmessage = this._onmessage.bind(this);
		this.$conn.onclose = this._onclose.bind(this);

		return this;
	}

	private _process(type: string, msg: string) {
		if (type === '~') { return; }
		else if (!this.granted) {
			switch (type) {
				case '>':
					if (this.$auth.promise) {
						this.$auth.promise.ok();
						delete this.$auth.promise;
					}
					this.granted = true;
					// fall through
				case '@':
				case '*':
					this.pending--;
					break;
				default:
					this.$auth && this.$auth.promise && this.$auth.promise.fail(msg);
					this.$auth = null;
					break;
			}
		}
		else if (type === '>') { this.pending--; }
		else if (this.$current) {
			var cur: Command = this.$current;
			var promise: QueryPromise = cur.promise;
			delete cur.promise;

			switch (cur.query && cur.query[0] || null) {
				case '?': case '+': this.$current.query = null; break;
				default: this.$current = null;
			}

			switch (type) {
				case '<':
					var data: any[] = JSON.parse(msg);
					if (promise) { promise.ok(data); }
					window.setTimeout(() => this.done(), 0);
					break;
				default:
					this.$current = null;
					promise.fail(msg);
			}
		}
		this._flush();
	}

	private _flush() {
		if (!this.ready) { return; }
		else if (!this.granted) {
			if (this.$auth) { this.$auth.response(); }
		}
		else {
			if (!this.$current) { this.$current = this.$queue.shift(); }
			if (this.$current && this.$current.query) { this.send(this.$current.query); }
		}
	}
}

class SocketCtrl {
	socket: Socket;
	error: string = null;

	constructor(args: {socket: Socket}) {
		this.socket = args.socket;
	}
	get connected() { return this.socket.connected; }
	get status() { return this.socket.status; }
	get granted() { return this.socket.granted; }
	get user() { return this.socket.user; }
	get pending() { return !this.socket.ready; }

	onsubmit(e: Event) {
		e.preventDefault();

		this.error = null;
		if (!this.connected) { this.socket.connect(true); }
		else if (!this.granted) {
			var form = (<HTMLFormElement> e.target);
			var username = (<HTMLInputElement> form.elements.namedItem('username')).value,
				password = (<HTMLInputElement> form.elements.namedItem('password')).value,
				auto = (<HTMLInputElement> form.elements.namedItem('autologin')).checked;
			this.socket
				.login(username, password, auto)
				.catch(e => { this.error = e; m.redraw(); });
		}
		else { this.socket.logout(); }
	}
}

function SocketView(ctrl: SocketCtrl) {
	var auth: any[] = null;
	if (!ctrl.connected) {
		auth = [
			ctrl.status, ' ',
			m('button', {type: 'submit', disabled: ctrl.connected}, 'Reconnect')
		];
	}
	else if (!ctrl.granted) {
		auth = [
			m('input', {name: 'username', placeholder: 'Username', disabled: ctrl.pending}), ' ',
			m('input', {name: 'password', type: 'password', placeholder: 'Password', disabled: ctrl.pending}),
			m('input', {type: 'checkbox', 'name': 'autologin', disabled: ctrl.pending}),
			m('button', {type: 'submit', disabled: ctrl.pending}, 'Login')
		];
	}
	else {
		auth = [
			'Logged in as ', m('span', {class: 'user'}, ctrl.user), '. ',
			m('button', {type: 'submit', disabled: ctrl.pending}, 'Logout')
		];
	}

	return m('div', {class: 'socket status ' + (ctrl.granted ? 'in' : (ctrl.pending ? 'pending' : 'out'))},
		m('div', {class: 'error'}, ctrl.error), ' ',
		m('form', {class: 'login', onsubmit: ctrl.onsubmit.bind(ctrl)}, auth)
	);
}
