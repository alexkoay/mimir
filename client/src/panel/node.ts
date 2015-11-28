import {State, Extendable} from './state';
export {State};

export class Registry {
	static list: { [id: string]: typeof Node; } = {};
	static set(name: string, type: typeof Node) { Registry.list[name] = type; }
	static get(name: string): typeof Node {
		if (name in Registry.list) { return Registry.list[name]; }
		else { throw 'Node type not found: ' + name; }
	}
}

export class NodeList {
	private $self: Node;
	private $list: Node[];

	constructor(self: Node, list?: Node[]) {
		this.$list = list || [];
		this.reparent(self);
	}
	toJSON() { return this.$list; }

	// identity
	reparent(self: Node) {
		if (!self) { throw 'NodeList must be owned by a Node, instead got: ' + JSON.stringify(self); }
		this.$self = self;
		this.$list.forEach(child => child.inherit(this, self.will()));
		return this;
	}

	// properties
	get length() { return this.$list.length; }
	get last() { return this.length > 0 ? this.$list[this.length-1] : null; }

	// accessors
	at(pos: number) { return this.$list[pos] || null; }
	id(key: number) { return this.$list.find(child => child.key === key); }
	pos(key: number | Node) {
		if (key instanceof Node) { return this.$list.findIndex(child => child === key); }
		else { return this.$list.findIndex(child => child.key === key); }
	}

	// iterators
	each(fn: {(node: Node): void}) { this.$list.forEach(fn); }
	map<T>(fn: {(node: Node): T}): T[] { return this.$list.map(fn); }
	depth(fn: {(node: Node): void}, reverse?: boolean) {
		this.prune();
		var list = this.$list.slice();
		if (reverse) { list.reverse(); }
		list.forEach(child => { fn(child); child.children.depth(fn, reverse); });
	}
	collect(reverse?: boolean) {
		var list: Node[] = [];
		this.depth(child => list.push(child), reverse);
		return list;
	}


	// mutators
	initialize(arg: string | State) {
		var state: State;
		if (typeof arg === 'string') { state = {type: arg}; }
		else { state = arg; }

		var node = new (Registry.get(state.type))(state);
		node.inherit(this, this.$self.will());

		if (state.children) { state.children.forEach((child: State) => node.children.create(child)); }
		return node;
	}
	create(state: string | State) { return this.insert(this.initialize(state)); }
	insert(node: Node) { this.$list.push(node); return node; }
	change(node: Node, state: string | State | Node) {
		var pos = this.pos(node);
		if (pos < 0) { return null; }

		var next: Node;
		if (state instanceof Node) { next = (<Node> state); }
		else {
			if (typeof state === 'string') {
				let freeze = node.state();
				freeze['type'] = (<string> state);
				state = freeze;
			}
			next = this.initialize(<State> state);
		}

		next.children.adopt(node.children, 0);
		this.$list[pos] = next;
		return next;
	}
	adopt(other: NodeList, pos?: number) {
		other.reparent(this.$self);
		if (pos === undefined) { this.$list.push(...other.$list); }
		else { this.$list.splice(pos, 0, ...other.$list); }
		return this;
	}
	delete(node: Node, disown?: boolean) {
		var pos = this.pos(node);
		if (pos < 0) { return false; }

		this.$list.splice(pos, 1);
		if (!disown) { this.adopt(node.children, pos); }
		return true;
	}
	prune(recurse?: boolean) {
		if (recurse) { this.$list.forEach(child => child.children.prune(true)); }
		this.$list = this.$list.filter(child => !child.dead());
		return this;
	}
}

var key: number = 0;
export default class Node {
	static register(name: string, type: typeof Node) { Registry.set(name, type); }

	private $key: number = ++key;
	private $type: string;
	protected parent: NodeList;
	error: any = null;
	children: NodeList = new NodeList(this);

	constructor(state: State) { this.$type = state.type || null; }
	inherit(parent: NodeList, will: any): void { this.parent = parent; }
	will(): any { return {}; }

	// fixed (doesn't need to be overridden except in extraordinary situations)
	get key() { return this.$key; }
	get type() { return this.$type; }
	toJSON() { return this.state().include({children: this.children}); }

	// node state
	dead() { return true; }
	state() { return new Extendable(this.type); }
	view(...any: any[]): any { return null; }
}

/* interactions
Reports
- Load > replace with state

Explore
- Load > change Table
- Table > child Data

Query
- Editor > change Load
- Editor > child Data
- Editor

Data
*/