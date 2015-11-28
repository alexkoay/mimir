
var key = 0;
export default class Basic {
	protected id: number = ++key;
	cols: [string, string][];
	rows: any[][];
	hash: number = new Date().getTime();
	onchange: {(data: Basic): void} = (data: Basic) => {};

	constructor(cols: [string, string][], rows?: any[][]) {
		this.cols = cols || [];
		this.rows = rows || [];
	}
	private _update() { this.hash = new Date().getTime(); }

	get count() { return this.rows.length; }

	meta(cols: [string, string][]) {
		this.cols = cols;
		this.clear();
	}
	clear() {
		this.rows = [];
		this._update();
	}
	insert(rows: any[][]) {
		Array.prototype.push.apply(this.rows, rows);
		this._update();
	}

	xlsx() {
		var cols = this.cols, rows = this.rows;
		var sheet: XLSXSheet = {};
		cols.forEach((col, C) => {
			var addr: string = XLSX.utils.encode_cell({c:C, r:0});
			sheet[addr] = {v: col[0], t:'s'};
		});
		rows.forEach((row, R) => {
			row.forEach((val, C) => {
				if (val === null) { return; }
				var cell: XLSXCell = {v: val, t: 's'};
				switch (cols[C][1]) {
					case 'int4': case 'int8':
					case 'numeric':
						cell.t = 'n';
						break;
					case 'date':
						cell.v = moment(val).diff(moment('1899-12-30'), 'days');
						cell.t = 'n';
						cell.z = XLSX.SSF._table[14];
						break;
				}

				var addr: string = XLSX.utils.encode_cell({c:C, r:R+1});
				sheet[addr] = cell;
			})
		});
		sheet['!ref'] = XLSX.utils.encode_range({s: {c:0,r:0}, e:{c:cols.length-1, r:rows.length}});

		var book = {SheetNames: ['data'], Sheets: {data: sheet}};

		var out = XLSX.write(book, {bookType:'xlsx', type: 'binary'});
		var buf = new ArrayBuffer(out.length), view = new Uint8Array(buf);
		for (var i=0; i != out.length; ++i) { view[i] = out.charCodeAt(i) & 0xFF; }

		saveAs(new Blob([buf], {type:'application/octet-stream'}), 'explorer ' + moment().format('YYYYMMDD HHmmss') + '.xlsx');
	}
}
