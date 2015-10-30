
export default class {
	constructor(name) {
		this.temp = [];
		this.perm = [];
	}

	once(fn) { this.temp.push(fn); }
	add(fn) { this.perm.push(fn); }

	trigger() {
		var args = arguments;
		this.temp.splice(0, this.temp.length).forEach(fn => window.setTimeout(() => fn.apply(null, args), 0));
		this.perm.forEach(fn => window.setTimeout(() => fn.apply(null, args), 0));
	}

	remove(fn) {
		this.temp = this.temp.filter(i => i === fn);
		this.perm = this.perm.filter(i => i === fn);
	}
	clear() {
		this.temp.splice(0, this.temp.length);
		this.perm.splice(0, this.perm.length);
	}
}
