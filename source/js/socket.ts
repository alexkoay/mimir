import Socket, { Context } from './lib/socket';

export default new Socket('ws://' + location.host + '/socket');
export { Socket, Context };