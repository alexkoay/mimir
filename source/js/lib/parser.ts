import moment from 'moment';
import isString from 'lodash/isString';
import Query from './query';

export type Parameter = {
	key?: string,
	_key?: string,
	name: string,
	default?: string | number,
	type?: string,
	req?: boolean
};

export function parse(command: string) {
	var params = command.split('\n')
		.map((line): Parameter => {
			var start = line.indexOf('--#('), end = line.lastIndexOf(')#');

			if (start < 0 || end < 0 || end < start) { return null; }
			try {
				var found = eval(line.slice(start+3, end+1));
				if (typeof found === 'string' || found instanceof String) { return { name: <string> found }; }
				else if (found.name !== undefined) { return found; }
				else if (found.key !== undefined) { found.name = found.key; return found; }
				else { return null; }
			}
			catch (e) { return null; }
		})
		.filter(param => param !== null);

	// ensure no repeats
	var keys: string[] = [];
	params.forEach((p, i) => {
		p._key = p.key;

		if (p.key === undefined) { p.key = i.toString(); }
		if (isString(p.key)) { p.key = (<any> p.key).toString(); }

		var t = 1;
		if (keys.indexOf(p.key) >= 0) {
			while (keys.indexOf(p.key + '-' + t) >= 0) { ++t; }
			p.key = p.key + '-' + t;
		}
		keys.push(p.key);
	})

	return params;
}

// helpers /////////////////////////////////////////////////////////////////////

function today(days: number) { return moment().add(days || 0, 'days').format('YYYY-MM-DD'); }