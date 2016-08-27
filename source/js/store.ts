import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import Root, { State } from './reducers/root';

export default createStore(Root, applyMiddleware(thunk));
export { State };