import * as CodeMirror from 'codemirror';
import 'codemirror/mode/sql/sql';

import $ from 'jquery';
import 'jquery-ui/ui/widgets/resizable';

import store from '../../store';
import { edit, execute } from '../../actions/editor';

export default {
	oncreate: function(n: MithrilVNode) {
		this.$codemirror = CodeMirror.fromTextArea(<HTMLTextAreaElement> n.dom.querySelector('textarea'), {
			lineNumbers: true,
			mode: 'text/x-pgsql',
			theme: 'blackboard',
			indentUnit: 4,
			indentWithTabs: true,
			lineWrapping: true,
			extraKeys: {
				'Ctrl-Enter': () => store.dispatch(execute())
			}
		});
		this.$codemirror.on('change', () => store.dispatch(edit(this.$codemirror.getValue())));
		this.$codemirror.setSize(null, 100);

		var $el = $(this.$codemirror.getWrapperElement());
		$el.resizable({
			handles: "s",
			minHeight: 100,
			resize: (e: Event) => {
				this.$codemirror.setSize(null, $el.height());
				this.$codemirror.refresh();
			}
		});
	},
	view: function(n: MithrilVNode) {
		var state = store.getState().editor;
		if (this.$codemirror && this.$codemirror.getValue() != state.query) { this.$codemirror.setValue(state.query || ''); }
		return m('div.editor-panel',
			m('textarea',
				{   tabindex: -1,
				    autofocus: true,
				    oninput: (e: Event) => store.dispatch(edit((<HTMLTextAreaElement> e.target).value))
				},
			state.query || '')
		);
	}
}
