import socket from '../../socket';

export default {
	login: function(user: string, pass: string) {
		this.$submit = true;
		this.$error = null;
		return socket.login(user, pass)
			.then(() => this.$submit = false)
			.catch((e: string) => {
				if (e === 'Already trying to login.') {
					// wait for five seconds and reconnect if still not logged in
					window.setTimeout(() => {
						if (socket.authed) return;
						socket.connect(true);
						this.login(user, pass);
					}, 5000);
				}
				else {
					this.$submit = false;
					this.$error = e;
				}
			});
	},

	oninit: function(n: MithrilVNode) {
		this.$submit = false;
		this.$error = null;
	},
	oncreate: function(n: MithrilVNode) {
		if (window.localStorage.getItem('remember')) {
			var data = JSON.parse(window.localStorage.getItem('remember'));
			this.login(data[0], data[1]);
		}
	},
	onsubmit: function(n: MithrilVNode, e: Event) {
		e.preventDefault();
		if (!socket.connected) { socket.connect(true); }
		else if (!socket.authed && !(socket.authing || this.$submit)) {
			var form = (<HTMLFormElement> e.target);
			var username = (<HTMLInputElement> form.elements.namedItem('username')).value,
				password = (<HTMLInputElement> form.elements.namedItem('password')).value,
				remember = (<HTMLInputElement> form.elements.namedItem('remember')).checked;

			this.$submit = true;
			this.login(username, password).then(() => {
				window.localStorage.setItem('remember', JSON.stringify([username, password]));
			});
		}
		else {
			this.$submit = false;
			socket.logout();
			window.localStorage.removeItem('remember');
		}
	},

	view_status: function(): MithrilChild {
		if (socket.connecting)   return ['Connecting...'];
		if (socket.disconnected) return ['Reconnecting in ', socket.reconnect_wait.toFixed(1), 's...'];
		if (socket.authed)       return ['Logged in as ', m('span.user', socket.user || '<somebody>'), '.'];
		if (socket.connected)    return this.$submit ? ['Logging in...'] : m('span.error', this.$error);
		return ['Unknown status.'];
	},
	view_form: function(): MithrilChild {
		if (!socket.connected)  return m('button.-mini', {type: 'submit'}, 'Reconnect');
		else if (socket.authed) return m('button.-mini', {type: 'submit'}, 'Logout');
		else if (socket.authing || this.$submit)  return m('button.-mini', {type: 'submit'}, 'Cancel')
		else return [
			m('input', {name: 'username', placeholder: 'Username'}),
			m('input', {name: 'password', type: 'password', placeholder: 'Password'}),
			m('input', {name: 'remember', type: 'checkbox'}),
			m('button.-mini', {type: 'submit'}, 'Login')
		];
	},
	view: function(n: MithrilVNode) {
		return m('div.auth-panel',
			m('div.status', this.view_status()),
			m('form', {onsubmit: this.onsubmit.bind(this, n)}, this.view_form())
		);
	}
};
