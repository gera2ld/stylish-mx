export checkUpdate from './update';
export getEventEmitter from './events';
export * from './options';
export { initialize } from './init';

export function broadcast(data) {
  browser.tabs.sendMessage('CONTENT', data);
}
