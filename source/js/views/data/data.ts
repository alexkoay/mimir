import socket from '../../socket';
import { State } from '../../store'; 

import Query from '../../lib/query';
import Status from './status';
import Table from './table';

export default {
	view: function(n: MithrilVNode) {
		var data: Query = n.attrs.data || null;
		return m('div.data-panel',
			{class: n.attrs.class},
			data ? m(Status, {data}) : null,
			!data || data.failed ? m('div.error-panel', data && data.error || '') : null,
			data && data.rows.length ? m(Table, {data}) : null
		);
	}
}
