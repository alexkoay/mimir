import store, { State } from '../store';
import { Action } from '../reducers/editor';
import isEmpty from 'lodash/isEmpty';

type Dispatch = {(action: Action): void};
type GetState = {(): State};
type Thunk = {(dispatch: Dispatch, getState: GetState): void};

export function toggle(value?: boolean) : Action {
	return {type: 'toggle', value};
}

export function hide(value?: boolean) : Action {
	return {type: 'hide', value};
}

export function rename(name: string) : Action {
	return {type: 'rename', name};
}

export function edit(query: string) : Action {
	return {type: 'edit', query};
}

export function change(name: string, value: any) : Action {
	return {type: 'change', name, value};
}

export function reset() : Action {
	return {type: 'reset'};
}

export function load(name: string, query: string) : Action {
	return {type: 'load', name, query};
}

export function execute(): Thunk {
	return (dispatch, getState) => {
		var state = getState().editor;
		var name = state.name,
			query = state.query;

		var args: string[] | {[key: string]: string} = null;

		if (state.params) {
			// check all required
			if (state.params.some(p => isEmpty(state.args[p.key]))) { return; }

			// use array
			if (!state.params.some(p => p._key !== undefined)) { 
				args = state.params.map((p, i) => state.args[p.key || i]);
			}
			else {
				args = state.args;
			}
		}

		dispatch({type: 'execute', name, query, args});
	};
}

export function save(name?: string) : Thunk {
	return (dispatch, getState) => {
		var state = getState().editor;
		var final = name || state.name;
		if (!final) {
			var now = new Date();
			final = window.prompt('Save query as',
				'query ' + now.getFullYear().toString() + ('00' + (now.getMonth() + 1)).slice(-2) + ('00' + now.getDate()).slice(-2)
					+ ' ' + ('00' + now.getHours()).slice(-2) + ('00' + now.getMinutes()).slice(-2) + ('00' + now.getSeconds()).slice(-2));
		}
		dispatch({type: 'save', name});
	};
}
