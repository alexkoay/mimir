
import Socket from '../../socket';
import Node, {State, NodeList} from '../node';

export default class Root extends Node {
	private socket: Socket;

	constructor(state: State) {
		super(state);
		this.socket = new Socket(state['url']);
		this.socket.onchange = () => m.redraw();
		this.socket.connect().autologin();

		window.addEventListener('beforeunload', this.save.bind(this));
		this.load();
	}
	will() { return {socket: this.socket}; }

	load() {
		var args = JSON.parse(window.localStorage.getItem('state') || 'null');
		if (args && args.length > 0) {
			args.forEach((child: State) => this.children.create(child));
			this.children.prune(true);
		}
	}
	save() { window.localStorage.setItem('state', JSON.stringify(this.children)); }
}
