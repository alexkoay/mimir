import defer from 'lodash/defer';
import Timer from './timer';
import Context from './context';

const fib: number[] = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];
var key: number = 0;

type LoginPromise = { ok: {(): void}, fail: {(err: string): void} };
type AuthState = { state: boolean, user: string, promise: LoginPromise, response: {(): void} };
export type Context = Context;

export default class Socket {
	private $debug: boolean;
	private $url: string;

	// websocket
	private $conn: WebSocket = null;
	private $reconnect: Timer = new Timer(this.connect.bind(this));

	// authentication
	private $auth: AuthState = { state: false, user: null, promise: null, response: null };

	// command queue
	private $tokens: {[key: string]: Context} = { };
	private $queue: string[] = [];

	// events
	onchange: {(type: string): void} = (type: string) => {};

	constructor(url: string, debug?: boolean) {
		this.$debug = debug || false;
		this.$url = url;
		this.connect();
	}

// properties ////////////////////////////////////////////////////////////////

	get disconnected() { return this.$conn === null || this.$conn.readyState > 1; }
	get reconnect_wait() { return this.$reconnect.wait; }
	get connecting() { return (this.$conn && this.$conn.readyState < 1) || false; }
	get connected() { return (this.$conn && this.$conn.readyState == 1) || false; }
	get authing() { return this.$auth.promise !== null; }
	get authed() { return this.$auth.state; }
	get user() { return this.authed ? this.$auth.user : null; }

// methods ///////////////////////////////////////////////////////////////////

	connect(force?: boolean) {
		if (this.connected && !force) { return this; }
		this.$reconnect.cancel();

		// remove old connections
		if (this.$conn) {
			this.$conn.onclose = () => {};
			this.$conn.close();
		}

		// connect websocket
		defer(() => this.onchange('connecting'));
		this.$conn = new WebSocket(this.$url);
		this.$conn.onopen = this._onopen.bind(this);
		this.$conn.onmessage = this._onmessage.bind(this);
		this.$conn.onclose = this._onclose.bind(this);

		// clear authentication promise
		if (this.$auth && this.$auth.promise) { this.$auth.promise.fail(null); }
		this.$auth.state = false;
		this.$auth.promise = null;

		// remove pending queries and force resend
		this.$queue = [];
		for (var token in this.$tokens) {
			this.$tokens[token].retry();
		}

		return this;
	}

	login(user: string, password: string) {
		return new Promise<void>((ok, fail) => {
			if (this.user === user) { return ok(); }
			if (this.$auth.promise) { return fail('Already trying to login.'); }

			this.$auth.user = user;
			this.$auth.promise = { ok, fail };
			this.$auth.response = () => { this.$conn.send(user); this.$conn.send(password); }

			if (this.authed) { this.connect(true); }
			else { this._flush(); }
		});
	}
	logout() {
		this.$auth.state = false;
		this.$auth.response = null;
		this.connect(true);
	}

	acquire(token?: string) {
		if (!token) { token = '__internal__' + (++key).toString(); }

		if (this.$tokens[token] === undefined) {
			this.$tokens[token] = new Context(this, token, this._send.bind(this, token), this._release.bind(this, token));
		}
		return this.$tokens[token];
	}
	private _release(token: string) {
		delete this.$tokens[token];
	}

// handlers //////////////////////////////////////////////////////////////////

	private _onopen() {
		this.$reconnect.reset();
		this._flush();
		defer(() => this.onchange('connected'));
	}

	private _onclose() {
		var delay = Math.random() * fib[Math.min(this.$reconnect.retries, fib.length - 1)];
		this.$reconnect.schedule(delay);
		defer(() => this.onchange('disconnected'));
	}

	private _onmessage(msg: {data: string; type: string; target: WebSocket}) {
		if (this.$debug) { console.log('recv:', msg.data.slice(0, 100)); }
		if (!this.authed) {
			if (msg.data.slice(0, 2) != '@:' || msg.data[2] == '?' || msg.data[2] == '!') {
				if (msg.data[2] == '!') {
					this.$auth.promise.fail(msg.data.slice(3));
					this.$auth.promise = null;
					defer(() => this.onchange('denied'), 0);
				}
				return;
			}
			if (this.$auth.promise) { this.$auth.promise.ok(); }
			this.$auth.promise = null;
			this.$auth.state = true;
			defer(() => this.onchange('authed'));
			this._flush();
		}
		else {
			var sep = msg.data.indexOf(':');
			if (sep < 0) { sep = msg.data.length; }

			var cmd = msg.data[0], token = msg.data.slice(1, sep), args = msg.data.slice(sep+1);
			var error = false, data: any;
			if (args[0] === '!') {
				error = true;
				args = args.slice(1);
			}
			try { data = JSON.parse(args); }
			catch (e) { data = args; }

			if (this.$tokens[token] !== undefined) {
				this.$tokens[token].receive(cmd, error, data);
			}
		}
	}

// internal //////////////////////////////////////////////////////////////////

	private raw(data: string) { this.$conn.send(data); }
	private _send(token: string, cmd: string, args: string) {
		this.$queue.push(cmd + token + ':' + args);
		this._flush();
	}

	private _flush() {
		if (!this.connected) { return; }
		else if (!this.authed) {
			if (this.$auth.response !== null) { this.$auth.response(); }
		}
		else {
			while (this.$queue.length > 0) {
				var data = this.$queue.shift();
				if (this.$debug) { console.log('send:', data); }
				this.$conn.send(data);
			}
		}
	}
}
