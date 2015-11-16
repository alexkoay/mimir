import Panel, {State, NodeList} from '../panel';

export default class Error extends Panel {
	constructor(state: State) {
		super(state);
		if (state['restore']) { this.$close = true; }
		this.error = state['error'] || 'An unknown error occured.';
		this.children = null;
	}
	state() { return super.state().include({error: this.error, restore: true}); }
	view() { return super.view({}, m('samp.error', this.error)); }
}

Panel.register('error', Error);