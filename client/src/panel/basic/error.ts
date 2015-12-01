import Panel, {State, NodeList} from '../panel';

export default class Error extends Panel {
	constructor(state: State) {
		super(state);
		if (state['restore']) { this.$close = true; }
		this.error = state['error'] || 'An unknown error occured.';
	}
	state() {
		this.children.each(child => this.children.delete(child));
		return super.state().include({error: this.error, restore: true});
	}
	view() { return super.view({tree: false}, m('samp.error', this.error)); }
}

Panel.register('error', Error);