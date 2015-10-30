import Event from './event.js';

var fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];

export default class {
	constructor(url, debug) {
		this.$debug = debug || false;
		this.$url = url;

		// websocket
		this.$status = '';
		this.$ready = false;
		this.$granted = false;

		// commands
		this.$current = null;
		this.$queue = [];

		// events
		this.onstatus = new Event();
		this.onready = new Event();
		this.onlogin = new Event();

		this.$reconnect = 0;
		this._connect();
	}

// properties ////////////////////////////////////////////////////////////////

	get status() { return this.$status || ''; }
	get connected() { return (this.$conn && this.$conn.readyState === 1) || false; }
	get ready() { return this.$ready || false; }
	get granted() { return this.$granted; }
	get user() { return this.$granted ? this.$user : null; }

// methods ///////////////////////////////////////////////////////////////////

	autologin() {
		var auto = window.localStorage.getItem('autologin');
		if (auto) {
			var args = JSON.parse(auto);
			return this._login(args[0], args[1]);
		}
		else { return new Promise((ok, fail) => fail()); }
	}
	login(user, password, auto) {
		var p = this._login(user, password);
		if (auto) { p.then(() => window.localStorage.setItem('autologin', JSON.stringify([user, password]))); }
		return p;
	}
	_login(user, password) {
		return new Promise((ok, fail) => {
			if (this.user === user) { ok(); }
			else if (this.$auth && this.$auth.promise) { this.$auth.promise.fail(); }
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
		this._connect(true);
	}

	send(data) {
		if (this.$debug) { console.log('send:', data.slice(0, 30)); }
		if (this.$conn.readyState === 1) {
			this.$conn.send(data);
		}
	}
	cmd(query) {
		return new Promise((ok, fail) => {
			this.$queue.push({ query: query, promise: { ok: ok, fail: fail } });
			this._flush();
		});
	}
	list() { return this.cmd('#'); }
	schema(table) { return this.cmd('$' + table); }
	query(query, param) {
		if (param) { query = JSON.stringify([query, param]); }
		return this.cmd('?' + query);
	}

	data(num) {
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

			this.ready = false;
			this.send('*');
		}
	}

// handlers //////////////////////////////////////////////////////////////////

	_onopen() {
		this.$reconnect = 0;
		this.status = 'Connected.';
	}
	_onclose() {
		var delay = Math.random() * fib[Math.min(this.$reconnect, fib.length - 1)];
		this.status = 'Reconnecting in ' + Math.ceil(delay) + ' seconds... (#' + (++this.$reconnect) + ')';
		window.setTimeout(this._connect.bind(this), delay * 1000);
	}
	_onmessage(msg) {
		if (this.$debug) { console.log('recv:', msg.data.slice(0, 30)); }
		this._process(msg.data[0], msg.data.slice(1));
	}

// internal //////////////////////////////////////////////////////////////////

	set status(val) { this.$status = val; this.onstatus.trigger(this, val); }
	set granted(val) { this.$granted = val; this.onlogin.trigger(this, val); }
	set ready(val) { this.$ready = val; this.onready.trigger(this, val); }

	_connect(force) {
		if (this.connected && !force) { return; }
		this.status = 'Connecting...';

		// clear state
		this.$ready = false;
		this.$granted = false;

		// connect websocket
		this.$conn = new WebSocket(this.$url);
		this.$conn.onopen = this._onopen.bind(this);
		this.$conn.onmessage = this._onmessage.bind(this);
		this.$conn.onclose = this._onclose.bind(this);
	}

	_process(type, msg) {
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
					this.ready = true;
					break;
				case '*':
					break;
				default:
					this.$auth && this.$auth.promise && this.$auth.promise.fail(msg);
					this.$auth = null;
					break;
			}
		}
		else if (type === '>') { this.ready = true; }
		else if (this.$current) {
			var cur = this.$current;
			var promise = cur.promise;
			delete cur.promise;

			switch (cur.query && cur.query[0] || null) {
				case '?': case '+': this.$current.query = null; break;
				default: this.$current = null;
			}

			switch (type) {
				case '<':
					var data = JSON.parse(msg);
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

	_flush() {
		if (!this.ready) { return; }
		else if (!this.granted) {
			if (this.$auth) {
				this.$auth.response();
				this.ready = false;
			}
		}
		else {
			if (!this.$current) { this.$current = this.$queue.shift(); }
			if (this.$current && this.$current.query) {
				this.send(this.$current.query);
				this.ready = false;
			}
		}
	}
}
