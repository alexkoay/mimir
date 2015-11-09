import Node from './node';

export class Registry {
	static list: { [id: string]: typeof Panel; } = {};
	static set(name: string, type: typeof Panel) { Registry.list[name] = type; }
	static get(name: string): typeof Panel {
		if (name in Registry.list) { return Registry.list[name]; }
		else { throw 'Panel type not found: ' + name; }
	}
}

var key = 0;
export default class Panel {
	static register(name: string, type: typeof Panel) { Registry.set(name, type); }
	static icon(name: string, id: string): MithrilVirtualElement { return m('svg.icon', m('use', {href: 'icon/entypo/' + name + '.svg#' + id})); }
	static checkbox(attrs: {id: String, [key: string]: any}, label: string): MithrilVirtualElement { return m('span', m('input[type=checkbox]', attrs), m('label', {for: attrs.id}, label)); }

	protected $key: number = ++key;
	protected node: Node;
	private parent: any;
	private $args: any = null;

	constructor(node: Node, parent: any, state: any) {
		this.node = node;
		this.useParent(parent);
	}
	useParent(parent: any) { this.parent = parent; }

	args(...more: any[]): any {
		if (this.$args) { return this.$args; }
		else {
			this.$args = {};
			for (var key in this.parent) { this.$args[key] = this.parent[key]; }
			for (var i=0; i<more.length; ++i) {
				for (var key in more[i]) { this.$args[key] = more[i][key]; }
			}
			return this.$args;
		}
	}
	get data(): any { return null; }
	view(): MithrilVirtualElement { return null; }
}
