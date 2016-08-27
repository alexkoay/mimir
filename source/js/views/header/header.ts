import Auth from './auth';

import store from '../../store';
import { route } from '../../actions/view';

var list = [
	['editor', 'Query'],
	['reports', 'Reports'],
	['saved', 'Saved']
]

export default { 

	view: function(n: MithrilVNode) {
		var state = store.getState();
		return m('header.header-panel',
			m('h1', 'Data Explorer'),
			m('nav', m('ul',
				list.map(e => m('li',
					m('button',
						{   class: state.view === e[0] ? 'selected' : null,
							onclick: () => store.dispatch(route(e[0])),
							disabled: state.view === e[0]
						}, e[1]
					)
				))
			)),
			m(Auth)
		);
	}
};
