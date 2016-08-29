// unitless viewport implementation
export default class Viewport { 
	size: number = 0;   // size of the content

	show: number = 100; // size of the viewport
	gap: number = 0.5;  // number of gap blocks for smoother scroll

	// offset from top
	$offset: number = 0;
	get offset() { return Math.max(Math.min(this.$offset, this.size - this.show), 0); }
	set offset(n) { this.$offset = Math.max(Math.min(n || 0, this.size - this.show), 0); }

	// size of rendered content (includes gap)
	get block() { return this.show * this.gap; }
	get before() { return this.first; }
	get first() { return Math.max(this.offset - this.block, 0); }
	get last() { return Math.min(this.offset + this.show + this.block, this.size); }
	get after() { return this.size - this.last; }
}
