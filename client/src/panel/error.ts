import Panel, {State, NodeList} from './panel';

export default class Error extends Panel {
	error: string;

	constructor(state: State) {
		super(state);
	}
	inherit(parent: NodeList, will: any): void { super.inherit(parent, will); }
	will() { return {}; }
	dead() { return true; }
	state() { return super.state().include({}); }

	// model ///////////////////////////////////////////////////////////////////

	// controller //////////////////////////////////////////////////////////////

	// view ////////////////////////////////////////////////////////////////////

	view() { return super.view({}, null); }
}
