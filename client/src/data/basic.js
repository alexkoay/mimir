import Event from '../event.js';

var last = 0;

export default class {
	constructor(cols, rows) {
		this.id = ++last;
		this.cols = m.prop(cols || []);
		this.rows = m.prop(rows || []);
		this.count = () => this.rows().length;

		this.filters = [];
		this.view = m.prop([]);

		this.onfilter = new Event();
	}

	meta(cols) { this.cols(cols); this.clear(); }
	clear() { this.rows([]); this.view([]); }
	insert(rows) {
		Array.prototype.push.apply(this.rows(), rows);
		this.filter();
	}

	select(fn) {
		this.filters.push(fn);
		this.filter();
		return this.filters.length - 1;
	}
	reselect(id, fn) {
		this.filters[id] = fn;
		this.filter();
	}
	deselect(id) {
		var arr = this.filters;
		if (arr.length <= id) { return false; }

		arr[id] = null;
		while (arr.length > 0 && arr[arr.length-1] === null) { arr.pop(); }
		this.filter();
		return true;
	}
	unselect() {
		this.filters.splice(0, this.filters.length);
		this.view(this.rows().slice());
		this.onfilter.trigger(this);
		return true;
	}
	filter() {
		this.view(
			this.filters.reduce((rows, fn) =>
				fn === null ? rows : rows.filter(r => fn(r)),
				this.rows()
			)
		);
		this.onfilter.trigger(this);
	}

	xlsx(sel) {
		if (!window.XLSX) {
			var el = document.createElement('script');
			el.src = 'lib/xlsx.core.min.js';
			el.onload = () => this.xlsx(sel);
			document.head.appendChild(el);
		}
		else if (!window.saveAs) {
			var el = document.createElement('script');
			el.src = 'lib/FileSaver.min.js';
			el.onload = () => this.xlsx(sel);
			document.head.appendChild(el);
		}
		else { this._xlsx(sel); }
	}

	_xlsx(sel) {
		if (!XLSX || !window.saveAs) { return; }
		var cols = this.cols();
		var rows = sel ? this.view() : this.rows();
		var sheet = {};
		cols.forEach((col, C) => {
			var addr = XLSX.utils.encode_cell({c:C, r:0});
			sheet[addr] = {v: col[0], t:'s'};
		});
		rows.forEach((row, R) => {
			row.forEach((val, C) => {
				if (val === null) { return; }
				var cell = {v: val, t: 's'};
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

				var addr = XLSX.utils.encode_cell({c:C, r:R+1});
				sheet[addr] = cell;
			})
		});
		sheet['!ref'] = XLSX.utils.encode_range({s: {c:0,r:0}, e:{c:cols.length-1, r:rows.length}});

		var book = {SheetNames: ['data'], Sheets: {data: sheet}};

		var out = XLSX.write(book, {bookType:'xlsx', type: 'binary'});
		var buf = new ArrayBuffer(out.length), view = new Uint8Array(buf);
		for (var i=0; i != out.length; ++i) { view[i] = out.charCodeAt(i) & 0xFF; }

		window.saveAs(new Blob([buf], {type:'application/octet-stream'}), 'explorer ' + moment().format('YYYYMMDD HHmmss') + '.xlsx');
	}
}
