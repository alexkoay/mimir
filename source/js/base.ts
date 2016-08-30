import '../css/base.scss';

import defer from 'lodash/defer';

// setup socket
import socket from './socket';
socket.onchange = () => defer(m.redraw);

// setup store
import store from './store';
store.subscribe(() => defer(m.redraw));

// setup view
import Root from './views/root';
var view = m.mount(document.body, { view: () => m(Root, { store }) });
window.addEventListener('click', () => defer(m.redraw));

// export
import Query from './lib/query';

(<any> window).mimir = { socket, store, view, Query };
