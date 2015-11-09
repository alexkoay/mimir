import Node from './node';
import Panel from './panel';

function appear(el: HTMLElement, fn?: {(): any}) {
	/*var style = window.getComputedStyle(el);
	var height = style.height;

	el.style.opacity = '0';
	Velocity(el, {opacity: 1}, {duration: 200});

	el.style.height = '0';
	Velocity(el, {height: height}, {duration: 200, queue: false, complete: () => {
		el.style = null;
		if (fn) { fn(); m.redraw(); }
	}});*/
	fn && fn();
}

function disappear(el: HTMLElement, fn?: {(): any}) {
	fn && fn(); return;
	/*el.style.opacity = '1';
	Velocity(el, {opacity: 0}, {duration: 200});

	Velocity(el, {height: 0}, {duration: 200, queue: false, complete: () => {
		if (fn) { fn(); m.redraw(); }
	}});*/
}

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
