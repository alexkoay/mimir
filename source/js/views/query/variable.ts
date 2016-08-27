import { change } from '../../actions/editor';
import store from '../../store';
import isEmpty from 'lodash/isEmpty';

export default {
	view: function(n: MithrilVNode) {
		return m('div.variable',
			m('label', { for: 'var-' + n.attrs.key }, n.attrs.name),
			m('input', {
				name: 'var-' + n.attrs.key,
				class: isEmpty(n.attrs.value) && n.attrs.req ? 'required' : '',
				value: n.attrs.value,
				placeholder: n.attrs.key,
				oninput: (ev: Event) => store.dispatch(change(n.attrs.key, (<HTMLInputElement> ev.target).value))
			})
		);
	}
}