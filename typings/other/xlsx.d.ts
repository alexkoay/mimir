interface XLSXCell {
	v: any; t: string;
	w?: string; f?: string; r?: string; h?: string; c?: string; z?: string; l?: string; s?: string;
}
interface XLSXSheet { [cell: string]: XLSXCell; }

declare var XLSX : any;
