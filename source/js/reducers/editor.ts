import { parse, Parameter } from '../lib/parser'; 

type ArgObject = {[key: string]: string};
type ArgArray = string[];

export type State = {
	hide: boolean,

	full: boolean,
	name: string,
	query: string,
	saved: boolean,

	params: Parameter[],
	args: ArgObject;
	executed: boolean
}

export type Action = {
	type: string,
	name?: string,
	query?: string,
	args?: ArgObject | ArgArray,
	value?: any,
}


export default function(state: State, action: Action): State {
	if (state === undefined || action.type == 'new') {
		return {
			full: false,
			hide: false, name: '',  query: '',
			saved: false, executed: false,
			params: [], args: {}
		};
	}

	var rebuild = { args: false };
	state = Object.assign({}, state);
	switch (action.type) {
		case 'toggle':
			state.full = action.value !== undefined ? action.value : !state.full;
			break; 

		case 'hide':
			state.hide = action.value !== undefined ? action.value : !state.hide;
			break;

		case 'rename':
			state.name = action.name;
			state.saved = false;
			break;

		case 'edit':
			if (action.query != state.query) {
				state.query = action.query;
				state.saved = false;
				state.params = null;
				state.executed = false;
			}
			break;

		case 'change':
			state.args = Object.assign({}, state.args);
			state.args[action.name] = action.value;
			state.executed = false;
			break;

		case 'reset':
			state.args = null;
			state.executed = false;
			break;

		case 'load':
			state.full = true;
			state.name = action.name;
			state.query = action.query;
			state.saved = true;
			state.params = null;
			state.args = null;
			state.executed = false;
			break;

		case 'execute':
			if (action.query != state.query) {
				state.query = action.query;
				state.params = null;
			}
			state.name = action.name;
			state.executed = true;
			break;

		case 'save':
			state.name = action.name || state.name;
			if (state.name) {
				window.localStorage.setItem('query/' + state.name, state.query);
				state.saved = true;
			}
			break;
	}

	// rebuild params
	if (state.params === null) {
		state.params = parse(state.query);
		rebuild.args = true;
	}

	// rebuild args
	if (rebuild.args || state.args === null) {
		state.args = Object.assign({}, state.args, action.args);
		state.params.forEach((p, i) => {
			var key = p.key || i.toString();
			var value = '';
			if (action.args && (<ArgObject> action.args)[key] !== undefined) { state.args[key] = (<ArgObject> action.args)[key]; }
			else if (state.args[key] !== undefined) { return; }
			else if (p.default !== undefined) { state.args[key] = p.default.toString(); }
			else { state.args[key] = ''; }
		})
	} 

	return state;
}
