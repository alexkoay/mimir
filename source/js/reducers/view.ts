export type State = string;

export type Action = {
	type: string,
	dest: string
}

export default function(state: State, action: Action): State {
	if (state === undefined) {
		return 'editor';
	}

	switch (action.type) {
		case 'route':
			return action.dest || 'editor';

		case 'load':
			return 'editor';
	}
	return state;
}
