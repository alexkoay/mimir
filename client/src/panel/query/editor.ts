import Socket from '../../socket';
import Node from '../node';
import Panel from '../styled';
import Query from '../data/query';

import Load from './load';
export {Load};

export default class Editor extends Panel {
	private socket: Socket;
	private cmd: string;

	private last: Node;

	private auto: boolean;
	private wait: number;
	private timer: number;

	private capture: boolean;
	private noChord: boolean;

	constructor(node: Node, parent: any, state: any) {
		super(node, parent, state);

		state = state || {};
		this.$minimize = null;
		this.cmd = state.cmd || '';
		this.auto = state.auto || false;
		this.wait = state.wait || 1.0;

		if (state.execute) { this.execute(); }
	}
	useParent(parent: any) { super.useParent(parent); this.socket = parent.socket; }

	get data(): any { return {cmd: this.cmd, auto: this.auto, wait: this.wait}; }

/// features ///////////////////////////////////////////////////////////////////

	setAuto(val?: boolean) {
		if (val === undefined) { val = !this.auto; }
		this.auto = val;

		if (this.last && !(<Query> this.last.ctrl).isError) { this.last = null; }
	}
	setCapture(val?: boolean) {
		if (val === undefined) { val = !this.capture; }
		this.capture = val;
	}

/// query //////////////////////////////////////////////////////////////////////

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
		var node = this.node.createChild('data/query', {cmd: this.cmd, auto: true});
		if (this.auto && val !== undefined) {
			this.node.replaceNode(this.last, node, true) || this.node.insertNode(node);
			this.last = node;
		}
		else {
			(this.last
				&& (<Query> this.last.ctrl).isError
				&& this.node.replaceNode(this.last, node))
			|| this.node.insertNode(node);
			this.last = node;
		}
		m.redraw();
	}

/// keybinds ///////////////////////////////////////////////////////////////////

	keydown(e: KeyboardEvent) {
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
	keyup(e: KeyboardEvent) {
		if (this.noChord && (e.key == "Control" || e.keyCode == 17)) {
			this.capture = !this.capture;
			m.redraw();
		}
	}

/// load/save //////////////////////////////////////////////////////////////////

	load() { this.transform('query/load'); }
	save() {
		var name = window.prompt('Save the query as:');
		if (!name) { return; }

		name = name.trim();
		if (window.localStorage.getItem('query/' + name) && !window.confirm('Overwrite existing query?')) { return; }
		window.localStorage.setItem('query/' + name, this.cmd);
	}

/// render /////////////////////////////////////////////////////////////////////

	config(el: HTMLTextAreaElement, isInit: boolean) {
		if (!isInit) { el.focus(); }
	}
	view(): MithrilVirtualElement {
		return super.view({
			class: this.capture ? 'capture' : '',
			view: m('textarea', {
				oninput: (e: Event) => this.input((<HTMLTextAreaElement> e.target).value),
				onkeydown: this.keydown.bind(this),
				onkeyup: this.keyup.bind(this),
				config: this.config.bind(this),
			}, this.cmd),
			toolbar: {
				left: [
					m('button', {onclick: () => this.execute()}, 'Run'),
					m('button', {onclick: () => this.load()}, 'Load'),
					m('button', {onclick: () => this.save(), disabled: !this.last || (<Query> this.last.ctrl).isError}, 'Save')
				],
				right: [
					!this.auto ? null : m('span',
						m('input[type=number]',
							{min: 0.5, max: 5, step: 0.1, value: this.wait, disabled: !this.auto,
							onchange: (e: Event) => this.wait = parseFloat((<HTMLInputElement> e.target).value)}),
						' s'),
					Panel.checkbox({
						id: this.node.key + '-auto', checked: this.auto,
						onchange: (e: Event) => this.setAuto((<HTMLInputElement> e.target).checked)
					}, 'Auto'),
					Panel.checkbox({
						id: this.node.key + '-capture', checked: this.capture,
						onchange: (e: Event) => this.setCapture((<HTMLInputElement> e.target).checked)
					}, 'Capture')
				]
			}
		});
	}
}

Panel.register('query/editor', Editor);