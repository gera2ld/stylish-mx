import 'src/common/browser';
import Vue from 'vue';
import { i18n, sendMessage, injectContent, debounce } from 'src/common';
import handlers from 'src/common/handlers';
import 'src/common/ui/style';
import App from './views/app';
import { store } from './utils';

Vue.prototype.i18n = i18n;

new Vue({
  render: h => h(App),
}).$mount('#app');

const init = debounce(() => {
  injectContent('setPopup()');
  delayClear();
}, 100);
let delayedClear;

Object.assign(handlers, {
  GetPopup: init,
  SetPopup(data, src) {
    cancelClear();
    store.currentSrc = src;
    sendMessage({
      cmd: 'GetMetas',
      data: data.ids,
    })
    .then(styles => { store.styles = styles; });
  },
});
browser.tabs.onActivated.addListener(init);
browser.tabs.onUpdated.addListener(init);
init();

function clear() {
  store.styles = [];
  store.currentSrc = null;
  delayedClear = null;
}
function cancelClear() {
  if (delayedClear) clearTimeout(delayedClear);
}
function delayClear() {
  cancelClear();
  delayedClear = setTimeout(clear, 200);
}
