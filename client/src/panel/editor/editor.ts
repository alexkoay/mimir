import Socket from '../../socket';
import Query from '../data/query';
import Panel, {State, NodeList} from '../panel';

import Load from './load';
export {Load};

export default class Editor extends Panel {
	private socket: Socket;
	cmd: string;

	auto: boolean;
	wait: number;
	private timer: number;

	private last: Query;

	private capture: boolean;
	private noChord: boolean;

	constructor(state: State) {
		super(state);
		this.cmd = state['cmd'];
		this.auto = state['auto'] || false;
		this.wait = state['wait'] || 1.0;
		this.last = state['last'] || null;
	}
	inherit(parent: NodeList, will: any) {
		super.inherit(parent, will);
		this.socket = will.socket;
	}
	will() { return {socket: this.socket}; }
	state() { return super.state().include({cmd: this.cmd, auto: this.auto, wait: this.wait, last: this.last}); }
	toJSON() { return super.toJSON().exclude('last'); }
	close() { this.parent.delete(this, false); return this; }

	// model ///////////////////////////////////////////////////////////////////

	// controller //////////////////////////////////////////////////////////////

	setAuto(val: boolean) { this.auto = val !== undefined ? val : !this.auto; }
	setCapture(val: boolean) { this.capture = val !== undefined ? val : !this.capture; }

	// (auto)execute
	input(val: string) {
		this.cmd = val;
		if (val && this.auto) {
			window.clearTimeout(this.timer);
			this.timer = window.setTimeout(() => this.execute(val), this.wait * 1000);
		}
	}
	execute(val?: string) {
		window.clearTimeout(this.timer);
		if (val !== undefined) { this.cmd = val; }

		var data: State = {type: 'data/query', cmd: this.cmd};

		// detect if the last query was an error
		if (this.last && this.last.error) { this.last = <Query> this.children.last; }
		this.last = <Query> (
			(this.last
				&& ((this.auto && val !== undefined) || this.last.error)
				&& this.children.change(this.last, data))
			|| this.children.create(data));

		if (val !== undefined) { m.redraw(); }
	}

	// capture special keys
	onKeyDown(e: KeyboardEvent) {
		if (e.ctrlKey && (e.key == "Control" || e.keyCode == 17)) { this.noChord = true; }
		else { this.noChord = false; }

		var el = <HTMLTextAreaElement> e.target;
		if (e.ctrlKey && (e.key == "Enter" || e.keyCode == 13)) { this.execute(); }
		else if (this.capture && !e.ctrlKey && (e.key == "Tab" || e.keyCode == 9)) {
			e.preventDefault();

			var start = el.selectionStart, end = el.selectionEnd;
			el.value = el.value.substring(0, start) + '\t' + el.value.substring(end);
			el.selectionStart = el.selectionEnd = start + 1;
		}
	}
	onKeyUp(e: KeyboardEvent) {
		if (this.noChord && (e.key == "Control" || e.keyCode == 17)) {
			this.capture = !this.capture;
		}
	}

	// load/save
	load() { this.parent.change(this, 'editor/load'); }
	save() {
		var name = window.prompt('Save the query as:');
		if (!name) { return; }

		name = name.trim();
		if (window.localStorage.getItem('query/' + name) && !window.confirm('Overwrite existing query?')) { return; }
		window.localStorage.setItem('query/' + name, this.cmd);
	}

	// view ////////////////////////////////////////////////////////////////////

	view() {
		return super.view(
			{ class: this.capture ? 'capture' : null },
			[
				m('textarea', {
					oninput: (e: Event) => this.input((<HTMLTextAreaElement> e.target).value),
					onkeydown: this.onKeyDown.bind(this),
					onkeyup: this.onKeyUp.bind(this),
				}, this.cmd),
				Panel.toolbar([
					m('button', {onclick: () => this.execute()}, 'Run'),
					m('button', {onclick: () => this.load()}, 'Load'),
					m('button', {onclick: () => this.save(), disabled: !this.last || this.last.error}, 'Save'),
				], [
					!this.auto ? null : m('span',
						m('input[type=number]',
							{min: 0.5, max: 5, step: 0.1, value: this.wait, disabled: !this.auto,
							onchange: (e: Event) => this.wait = parseFloat((<HTMLInputElement> e.target).value)}),
						' s'),
					Panel.checkbox({
						id: this.key + '-auto', checked: this.auto,
						onchange: (e: Event) => this.setAuto((<HTMLInputElement> e.target).checked)
					}, 'Auto'),
					Panel.checkbox({
						id: this.key + '-capture', checked: this.capture,
						onchange: (e: Event) => this.setCapture((<HTMLInputElement> e.target).checked)
					}, 'Capture')
				])
			]
		);
	}
}

Panel.register('editor', Editor);