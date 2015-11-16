import {State} from '../panel';

function today() { return moment().format('YYYY-MM-DD'); }

var key = 0;
export class Parameter {
	private parent: number = key;
	key: string;
	name: string;
	value: string | number = null;
	type: string = null;
	force: boolean = false;

	constructor(args: any, old: {[key: string]: any}) {
		if (typeof args === 'string') { this.key = args; }
		else {
			this.key = args.key;
			this.name = args.name || null;
			this.value = args.value || null;
			this.type = args.type || null;
			this.force = args.force || false;
		}

		this.key = this.key.toString();
		this.name = this.name || this.key;
		if (this.value && typeof this.value !== 'string') { this.value = this.value.toString(); }

		if (!this.force && old && old[this.key] !== undefined) { this.value = old[this.key]; }
	}
	parameter() { return '%(' + this.key.replace('%', '').replace('(', '').replace(')', '') + ')s'; }
	toJSON() { return this.value; }

	update(value: string) { this.value = value; }
	view(parent: number) {
		return m('span.param',
			m('label', {for: parent + '-cmd-' + this.key}, this.name),
			m('input', {id: parent + '-cmd-' + this.key,
				oninput: (e: Event) => this.update((<HTMLInputElement> e.target).value),
				value: this.value})
		)
	}
}

export default class Command {
	private key: number = ++key;
	private restore: {[key: string]: any};
	plain: boolean;
	cmd: string;
	edit: boolean = true;
	param: {[key: string]: Parameter};
	order: string[];

	constructor(state: State) {
		this.restore = state['param'] || {};
		this.edit = state['edit'] || true;
		eval('this.process`' + state['cmd'] + '`');
	}
	private process(cmds: string[], ...args: any[]) {
		if (cmds.length == 1) {
			this.plain = true;
			this.cmd = cmds[0];
		}
		else {
			this.plain = false;

			this.param = {};
			this.cmd = cmds[0];
			args.forEach((arg: any, i: number) => {
				var p = new Parameter(arg, this.restore);
				if (!(p.key in this.param)) { this.param[p.key] = p; }
				else { p = this.param[p.key]; }

				this.cmd += p.parameter();
				this.cmd += cmds[i+1];
			});
		}
	}
	state() { return {cmd: this.cmd, edit: this.edit, param: this.param}; }

	get completed() { return this.plain || Object.keys(this.param).every(key => !!this.param[key].value); }
	view(attr: any): any { return !this.plain && this.edit ? m('form', attr, Object.keys(this.param).map(key => this.param[key].view(this.key))) : null; }
}