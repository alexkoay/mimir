import '../css/base.scss';

// setup socket
import socket from './socket';
socket.onchange = () => m.redraw();

// setup store
import store from './store';
store.subscribe(() => m.redraw());

// setup view
import Root from './views/root';
var view = m.mount(document.body, { view: () => m(Root, { store }) });
window.addEventListener('click', m.redraw);

// export
import Query from './lib/query';

(<any> window).mimir = { socket, store, view, Query };
