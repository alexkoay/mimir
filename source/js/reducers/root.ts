import { combineReducers } from 'redux';
import editor, { State as Editor } from './editor';
import data, { State as Data } from './data';
import view, { State as View } from './view';

export type State = {editor: Editor, data: Data, view: View};
export default combineReducers<State>({editor, data, view});
