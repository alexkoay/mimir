
export default class Timer {
	private $handler: {(...args: any[]): void} = null;
	private $timer: number = null;
	private $count: number = 0;
	private $next: number = 0;

// constructor ///////////////////////////////////////////////////////////////

	constructor(func: {(...args: any[]): void}) { this.$handler = func; }

// properties ////////////////////////////////////////////////////////////////

	get wait(): number {
		var num = this.$next - Date.now();
		return num > 0 ? num/1000 : 0;
	}
	get retries(): number { return this.$count; }

// methods ///////////////////////////////////////////////////////////////////

	schedule(seconds: number, ...args: any[]) {
		if (this.$timer) { window.clearTimeout(this.$timer); }

		++this.$count;
		this.$timer = window.setTimeout(() => this.$handler(...args), seconds * 1000);
		this.$next = Date.now() + seconds * 1000;
	}
	repeat(seconds: number, ...args: any[]) {
		if (this.$timer) { window.clearTimeout(this.$timer); }

		++this.$count;
		this.$timer = window.setTimeout(() => { this.repeat(seconds, ...args); this.$handler(...args) }, seconds * 1000);
		this.$next = Date.now() + seconds * 1000;
	}
	cancel() { window.clearTimeout(this.$timer); }
	reset() { this.$count = 0; }
}
