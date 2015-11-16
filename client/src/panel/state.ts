export interface State {
	type: string;
	children?: any;
	[id: string]: any;
}

export class Extendable implements State {
	type: string;
	[id: string]: any;

	constructor(type: string) {
		this.type = type;
	}
	include(other: any) {
		Object.keys(other)
			.filter(key => key !== 'type')
			.forEach((key: string) => this[key] = other[key]);
		return this;
	}
	exclude(...keys: string[]) {
		keys.forEach(key => delete this[key]);
		return this;
	}
}
