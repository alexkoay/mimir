import store, { State } from '../store';
import { Action } from '../reducers/view';

type Dispatch = {(action: Action): void};
type GetState = {(): State};
type Thunk = {(dispatch: Dispatch, getState: GetState): void};

export function route(name: string) : Action {
	return {type: 'route', dest: name};
}
