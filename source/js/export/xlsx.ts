importScripts('/static/lib/xlsx.core.min.js');

type Column = [string, string];
type Row = any[];
type DataSet = [ Column[], Row[] ];
type Group = { [name: string]: DataSet };

var current = 'data';
var group: Group = { };
var started = false;

function start_export() {
	var sheets = Object.keys(group).reduce((prev, key) => {
		prev[key] = create_sheet(group[key][0], group[key][1]);
		return prev;
	}, <{[key: string]: XLSXSheet}> { });
 
	var book = {SheetNames: Object.keys(group), Sheets: sheets};

	var out = XLSX.write(book, {bookType:'xlsx', type: 'binary'});
	var buf = new ArrayBuffer(out.length), view = new Uint8Array(buf);
	for (var i=0; i != out.length; ++i) { view[i] = out.charCodeAt(i) & 0xFF; }

	var blob = new Blob([buf], {type:'application/octet-stream'});

	var now = new Date();
	var datestr = now.getFullYear().toString() + ('00' + (now.getMonth() + 1)).slice(-2) + ('00' + now.getDate()).slice(-2)
		+ ' ' + ('00' + now.getHours()).slice(-2) + ('00' + now.getMinutes()).slice(-2) + ('00' + now.getSeconds()).slice(-2); 

	return [blob, 'export ' + datestr + '.xlsx'];
}

function create_sheet(cols: Column[], rows: Row[]) {
	var sheet: XLSXSheet = {};

	// header
	cols.forEach((col, C) => {
		var addr: string = XLSX.utils.encode_cell({c:C, r:0});
		sheet[addr] = {v: col[0], t:'s'};
	});

	// lines
	rows.forEach((row, R) => {
		row.forEach((val, C) => {
			if (val === null) { return; }
			var cell: XLSXCell = {v: val, t: 's'};
			switch (cols[C][1]) {
				case 'int4': case 'int8':
				case 'float8':
				case 'numeric':
					cell.t = 'n';
					break;
				case 'date':
				case 'timestamptz':
					cell.v = (new Date(val).getTime() / 1000 / 60 / 60 / 24) + 25569;
					cell.t = 'n';
					cell.z = XLSX.SSF._table[14];
					break;
			}

			var addr: string = XLSX.utils.encode_cell({c:C, r:R+1});
			sheet[addr] = cell;
		})
	});

	sheet['!ref'] = XLSX.utils.encode_range({s: {c:0,r:0}, e:{c:cols.length-1, r:rows.length}});
	return sheet;
}

onmessage = function (e: { data: { type: string, data: any } }) {
	if (started) { return; }
	
	var action = e.data;
	switch (action.type) {
		case 'sheet':
			current = action.data;
			break;

		case 'meta':
			if (group[current] === undefined) {
				group[current] = [null, null];
			}
			group[current][0] = <Column[]> action.data;
			break;

		case 'data':
			if (group[current] === undefined) { group[current] = [null, null]; }
			if (group[current][1] === null) { group[current][1] = <Row[]> action.data; }
			else { group[current][1] = group[current][1].concat(<Row[]> action.data); }
			break;

		case 'start':
			started = true;
			this.postMessage(start_export());
			this.close();
			break;
	}
}
