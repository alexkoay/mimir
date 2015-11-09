import Node from './node';
import Panel from './panel';

export default class Styled extends Panel {
	protected $minimize: boolean;

	minimize(val: boolean) { this.$minimize = val; }
	transform(type: string) { this.node.changeSelf(type); }
	close(all?: boolean) { this.node.deleteSelf(all); }

	view(data?: {
		class?: string,
		view?: MithrilVirtualElement,
		toolbar?: {left?: MithrilVirtualElement[], right?: MithrilVirtualElement[]}
	}): MithrilVirtualElement {
		data = data || {};
		return m('div.panel',
			{
				key: this.$key,
				class: [this.node.type.replace('/', '-'), (this.$minimize ? 'min' : 'max'), (data.class || '')].join(' '),
			},
			m('div.control.left',
				this.$minimize === null ? null
				: (!this.$minimize
					? m('button.min', {onclick: () => this.minimize(true)}, Panel.icon('triangle-down', 'Triangle_down'))
					: m('button.max', {onclick: () => this.minimize(false)}, Panel.icon('triangle-right', 'Triangle_right')))
			),
			m('div.control.right', m('button.close', {onclick: () => this.close()}, Panel.icon('cross', 'Cross'))),
			m('div.content',
				data.view,
				data.toolbar ? m('div.toolbar', data.toolbar.left, m('span.spacer'), data.toolbar.right) : null
			)
		);
	}
}
