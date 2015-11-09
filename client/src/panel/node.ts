import Panel, {Registry} from './panel';

export interface State {
	// data
	type: string;
	data: any;
	dead: boolean;

	// tree
	down: State[];
}

var key = 0;
export default class Node {
	private $key: number = ++key;
	private $ctrl: Panel;

	// data
	private $type: string;
	private $data: any;
	private $dead: boolean = false;

	// tree
	private $up: Node;
	private $down: Node[] = [];

	constructor(type: string, data: any, up?: Node) {
		this.$up = up || null;
		this.$type = type;
		this.$data = data || null;
		this.refreshSelf();
	}
	get key() { return this.$key; }
	get type() { return this.$type; }
	get dead() { return this.$dead; }
	get ctrl() { return this.$ctrl; }

/// state //////////////////////////////////////////////////////////////////////

	view(): any {
		var self = this.$dead ? null : this.$ctrl.view();
		var down = this.$down.map(child => child.view());
		down.reverse();
		if (!self) { return down; }
		else if (!down) { return self; }
		else { return [self].concat(down); }
	}

	// restore tree from save state
	static loadState(tree: State, up?: Node): Node {
		var node = new Node(tree.type, tree.data, up);
		tree.down && tree.down.forEach(child => node.$down.push(Node.loadState(child, node)));
		if (tree.dead) { node.$dead = true; }
		if (!up) { node.pruneTree(); }
		return node;
	}

	// generate save state
	saveState(): State {
		this.$data = this.$ctrl.data;
		return {
			type: this.$type,
			data: this.$data,
			dead: this.$dead,
			down: this.$down.map(child => child.saveState())
		};
	}

/// manipulation ///////////////////////////////////////////////////////////////

	private refreshSelf() { this.$ctrl = new (Registry.get(this.$type))(this, this.$up ? this.$up.$ctrl.args() : null, this.$data); }
	changeSelf(type: string, data?: any) {
		this.$data = data || this.$ctrl.data;
		this.$type = type;
		this.refreshSelf();
	}
	replaceWithState(state: State) {
		var node = Node.loadState(state, this.$up);
		this.$up.replaceNode(this, node);
	}
	deleteSelf(alsoChild?: boolean) {
		this.$dead = true;
		if (alsoChild) { this.$down = []; }
		this.pruneTree();
	}
	private pruneSelf() {
		if (this.$dead && this.$down.length == 0) {
			this.$up.removeNode(this);
		}
	}
	private pruneTree() {
		this.$down.forEach(child => child.pruneTree());
		this.pruneSelf();
	}

/// children ///////////////////////////////////////////////////////////////////

	createChild(type: string, data: any): Node { return new Node(type, data, this); }
	insertNode(node: Node, pos?: number): number {
		if (!node) { return null; }
		else if (pos === undefined) { this.$down.push(node); return this.$down.length - 1; }
		else { this.$down.splice(pos, 0, node); return pos; }
	}
	insertNewChild(type: string, data: any, pos?: number): Node {
		var node = this.createChild(type, data);
		this.insertNode(node, pos);
		return node;
	}
	replaceNode(old: Node, node: Node, retain?: boolean) {
		if (!old) { return null; }
		var pos = this.$down.findIndex(c => c === old);
		if (pos >= 0) {
			this.$down[pos] = node;
			if (retain) {
				node.$down = node.$down.concat(old.$down);
				var args = node.$ctrl.args();
				old.$down.forEach(child => child.$ctrl.useParent(args));
			}
			return true;
		}
		else { return null; }
	}
	private removeNode(node: Node): boolean {
		if (!node) { return false; }
		var pos = this.$down.findIndex(c => c === node);
		if (pos >= 0) {
			this.$down.splice(pos, 1);
			this.pruneSelf();
		}
		return true;
	}

	get numChildren() { return this.$down.length; }
}
