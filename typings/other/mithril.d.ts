// Type definitions for Mithril
// Project: http://lhorie.github.io/mithril/
// Definitions by: Leo Horie <https://github.com/lhorie>, Chris Bowdon <https://github.com/cbowdon>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

//Mithril type definitions for Typescript

type MithrilChildBase = MithrilVNode | string | number | boolean;
type MithrilChild = MithrilChildBase | MithrilChildBase[];

interface MithrilStatic {
	(selector: MithrilComponent | string, attributes: Object, ...children: MithrilChild[]) : MithrilVNode;
	(selector: MithrilComponent | string, ...children: MithrilChild[]) : MithrilVNode;

	render(element: Element, vnodes: MithrilVNode[] | MithrilVNode) : void;
	mount(element: Element, component: MithrilComponent) : void;

	redraw: MithrilRedraw;
}

interface MithrilVNode {
	tag: string | Object
	key?: string
	attrs?: any
	children: MithrilVNode[] | string | number | boolean
	text: string | number | boolean
	dom?: Element
	domSize?: Element
	state: any
	events?: any
}

interface MithrilComponent {
    oninit?(vnode?: MithrilVNode) : void
	oncreate?(vnode?: MithrilVNode) : void
	onupdate?(vnode?: MithrilVNode) : void
	onbeforeremove?(vnode?: MithrilVNode, done?: {():void}) : void
	onremove?(vnode?: MithrilVNode) : void
	onbeforeupdate?(vnode?: MithrilVNode, old?: any) : boolean

	data?: any
	state?: any
	view(vnode: MithrilVNode) : MithrilChild
	[key: string]: any
}

interface MithrilRedraw {
	(): void;
	strategy: (value?: string) => string;
}

declare var m: MithrilStatic;