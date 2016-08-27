import isEmpty from 'lodash/isEmpty';
import Variable from './variable';

import store from '../../store';
import { execute, reset } from '../../actions/editor';

export default {
	view: function(n: MithrilVNode) {
		var state = store.getState().editor;
		return m('form.params-panel',
			{ onsubmit: (e: Event) => { e.preventDefault(); store.dispatch(execute()); } },
			state.params.map((p, i) => m(Variable, Object.assign({}, p, {key: p.key || i, value: state.args[p.key || i]}))),
			m('button.submit', {type: 'submit'}, 'Submit')
		);
	}
}
