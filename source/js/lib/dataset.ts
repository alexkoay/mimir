import defer from 'lodash/defer';

export type ColumnDefinition = [string, string];

var seq = 0;
export default class DataSet {
	protected key: number = ++seq;
	cols: ColumnDefinition[];
	rows: any[][];
	hash: number = Date.now();
	onchange: {(data: DataSet, msg: string): void} = (data: DataSet, msg: string) => {};

	private $export: number = 0;

	constructor(cols?: [string, string][], rows?: any[][]) {
		this.cols = cols || [];
		this.rows = rows || [];
	}
	private _update() { this.hash = Date.now(); }

	get count() { return this.rows.length; }
	get exporting() { return this.$export != 0; }

	meta(cols: ColumnDefinition[]) {
		this.cols = cols;
		this.clear();
	}

	clear() {
		this.rows = [];
		this._update();
	}
	insert(rows: any[][]) {
		for (var i=0; i<rows.length; ++i) {
			this.rows.push(rows[i]);
		}
		this._update();
	}

	export(type: string) {
		this.$export = Date.now();
		var worker = new Worker('/static/export.' + type + '.js');
		worker.addEventListener('message', (e: {data: [Blob, string]}) => {
			window.saveAs(e.data[0], e.data[1], false);
			this.$export = 0;
			this.onchange(this, 'exported');
		}, false);
		worker.addEventListener('error', console.log.bind(console), false);

		worker.postMessage({type: 'meta', data: this.cols});
		this._export(worker, 0);
	}
	_export(worker: Worker, offset: number) {
		worker.postMessage({type: 'data', data: this.rows.slice(offset, offset+1e5)});

		offset += 1e5;
		if (offset < this.count) {
			defer(this._export.bind(this, worker, offset));
		}
		else {
			worker.postMessage({type: 'start'});
			this.onchange(this, 'exporting');
		}
	}
}
