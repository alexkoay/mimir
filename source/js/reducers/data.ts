import socket from '../socket';
import Query from '../lib/query';

export type State = {
	current: Query,
	recent: Query[]
}

export type Action = {
	type: string,
	index?: number,
	name?: string,
	query?: string,
	args?: string[] | {[key: string]: string},
}

export default function(state: State, action: Action): State {
	if (state === undefined) {
		return { current: null, recent: [] };
	}

	if (state.current) {
		if (action.type === 'retry' || action.type === 'refresh') {
			state.current.ended && state.current.query();
			return state;
		}
		if (action.type === 'cancel') {
			state.current.cancel();
			return state;
		}
	}

	state = Object.assign({}, state);
	switch (action.type) {
		case 'clear':
		case 'load':
			if (state.current) {
				state.current.cancel();
				state.recent = state.recent.concat(state.current);
				while (state.recent.length > 20) { state.recent.shift(); }
				state.current = null;
			}
			break;

		case 'execute':
			if (state.current) {
				state.current.cancel();
				state.recent = state.recent.concat(state.current);
				while (state.recent.length > 20) { state.recent.shift(); }
			}

			state.current = new Query(socket, action.name, action.query, action.args);
			state.current.onchange = () => requestAnimationFrame(m.redraw);
			state.current.query();
			break;

		case 'recall':
			if (state.current) {
				if (!state.current.ended) { state.current.cancel(); }
				state.recent = state.recent.concat(state.current);
			}
			state.current = state.recent.splice(action.index, 1)[0];
			break;
	}
	return state;
}
