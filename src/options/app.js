import 'src/common/browser';
import Vue from 'vue';
import { sendMessage, i18n } from 'src/common';
import options from 'src/common/options';
import getPathInfo from 'src/common/pathinfo';
import handlers from 'src/common/handlers';
import 'src/common/ui/style';
import { store } from './utils';
import App from './views/app';

Vue.prototype.i18n = i18n;

zip.workerScriptsPath = '/public/lib/zip.js/';
initialize();

function loadHash() {
  store.route = getPathInfo();
}

function initialize() {
  Object.assign(store, {
    styles: [],
  });
  document.title = i18n('extName');
  window.addEventListener('hashchange', loadHash, false);
  loadHash();
  loadData();
  options.ready(() => {
    new Vue({
      render: h => h(App),
    }).$mount('#app');
  });
  Object.assign(handlers, {
    StylesUpdated: loadData,
    AddStyle({ update }) {
      update.message = '';
      store.styles.push(update);
    },
    UpdateStyle(data) {
      if (!data) return;
      const index = store.styles.findIndex(item => item.props.id === data.where.id);
      if (index >= 0) {
        const updated = Object.assign({}, store.styles[index], data.update);
        Vue.set(store.styles, index, updated);
      }
    },
    RemoveStyle(id) {
      const i = store.styles.findIndex(style => style.props.id === id);
      if (i >= 0) store.styles.splice(i, 1);
    },
  });
}

function loadData() {
  sendMessage({ cmd: 'GetData' })
  .then(data => {
    [
      'styles',
    ].forEach(key => {
      Vue.set(store, key, data[key]);
    });
  });
}
