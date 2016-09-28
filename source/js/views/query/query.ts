import isEmpty from 'lodash/isEmpty'; 
import store from '../../store';
import { hide, toggle, rename, save, execute, reset } from '../../actions/editor';

import Editor from './editor';
import Params from './params';

export default {
	hide: function() { store.dispatch(hide()); },
	toggle: function() { store.dispatch(toggle()); },
	name: function() { store.dispatch(rename((<HTMLInputElement> this).value)); },
	save: function() { store.dispatch(save()); },
	execute: function() { store.dispatch(execute()) },

	view: function(n: MithrilVNode) {
		var state = store.getState().editor;
		return m('div.query-panel',
			{ class: n.attrs.class + ' ' + (state.hide ? 'hide' : '') },
			!state.hide ? m(Editor) : null,
			m('div.toolbar',
				m('button', {onclick: this.hide}, state.hide ? 'Show' : 'Hide'),
				m('button.run',
					{
						class: state.executed || !state.query ? '' : 'main',
						onclick: () => store.dispatch(execute()),
						disabled: state.executed || !state.query
					}, state.executed ? 'Ran' : 'Run'),
				!state.hide ? [
					m('button', {onclick: this.save, disabled: state.saved || !state.query}, state.saved ? 'Saved' : 'Save'),
					m('input', {placeholder: 'Unnamed query', oninput: this.name, value: state.name})
				] : m('div.title', state.name || (state.query.split('\n')[0].slice(0, 100))),
				m('button', {onclick: () => store.dispatch(reset()), disabled: isEmpty(state.params) }, 'Reset')
			),
			!isEmpty(state.params) ? m(Params) : null
		);
	}
};
