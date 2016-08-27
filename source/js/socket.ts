import Socket, { Context } from './lib/socket';

export default new Socket('ws://localhost:8765', true);
export { Socket, Context };