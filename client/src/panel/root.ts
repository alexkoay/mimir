import Node from './node';
import Panel from './panel';

export default class Root extends Panel {
	private state: any;

	constructor(node: Node, parent: any, state: any) {
		super(node, parent, state);
		this.state = state;
	}
	args() { return this.state; }
	get data(): any { return null; }
}

Panel.register('root', Root);