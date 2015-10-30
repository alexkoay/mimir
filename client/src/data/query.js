import Event from '../event.js';
import Basic from './basic.js';

export default class extends Basic {
	constructor(socket, command, debug) {
		super([]);
		this.count = m.prop(0);

		this.$socket = socket;
		this.$cmd = command || '';
		this.$debug = debug;

		this.$buffer = 100;
		this.$cancel = false;

		this.onquery = new Event();
		this.onprocess = new Event();
		this.ondata = new Event();
		this.oncomplete = new Event();
	}

	get ready() { return this.$socket.ready; }
	get completed() { return this.rows().length / this.count(); }

	cancel() { this.$cancel = true; }
	query() {
		this.onquery.trigger(this);
		this.$cancel = false;
		return new Promise((ok, fail) => {
			this.oncomplete.once(ok);
			this.$socket.query(this.$cmd).then(::this._process).then(::this._retrieve).catch(fail);
		});
	}
	_retrieve() {
		if (this.$cancel) { return; }
		if (this.count() > this.rows().length) {
			var p = this.$socket.data(this.$buffer);
			p.then(this._data.bind(this, new Date().getTime()))
				.then(::this._retrieve)
				.catch(::console.log);
			p.catch(::this.query);
		}
	}
	_process([count, columns]) {
		this.count(count);
		super.meta(columns);
		this.onprocess.trigger(this);
	}
	_data(start, rows) {
		if (this.$cancel) { return; }
		super.insert(rows);

		// revise the loading buffer
		var wait = (new Date().getTime() - start) / 1000;
		this.$buffer = Math.min(Math.max(100, Math.floor(this.$buffer * 0.3 + rows.length / wait / 2 * 0.7)), 400000);
		if (this.$debug) { console.log('loaded', rows.length, 'in', wait, 'seconds, new buffer', this.$buffer); }

		// trigger events
		this.ondata.trigger(this);
		if (this.count() <= this.rows().length) { this.oncomplete.trigger(this, this.rows); }
	}
}
