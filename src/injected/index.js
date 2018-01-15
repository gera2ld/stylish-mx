import 'src/common/browser';
import { sendMessage, request } from 'src/common';
import { objectGet } from 'src/common/object';
import { getMeta, sendEvent } from './utils';

(function main() {
  if (document.documentElement.tagName.toLowerCase() !== 'html') return;

  if (window.__injected) return;
  window.__injected = 1;

  browser.__isContent = true;

  const IS_TOP = window.top === window;

  const store = {
    isApplied: false,
    styles: [],
    ids: [],
  };

  const handlers = {
    UpdateStyle({ isApplied, ids }) {
      if (isApplied != null) {
        store.isApplied = isApplied;
        applyStyles();
      }
      if (ids && ids.length) loadStyles(ids);
    },
  };
  browser.runtime.onMessage.addListener((req, src) => {
    const handle = handlers[req.cmd];
    if (handle) handle(req.data, src);
  });
  loadStyles();

  window.setPopup = () => {
    if (IS_TOP) {
      sendMessage({
        cmd: 'SetPopup',
        data: { ids: store.ids },
      });
    }
  };

  if (window.location.href.startsWith('https://userstyles.org/')) {
    document.addEventListener('DOMContentLoaded', initUserstylesOrg, false);
  }

  function loadStyles(ids) {
    sendMessage({
      cmd: 'GetInjected',
      data: {
        ids,
        url: window.location.href,
      },
    })
    .then(({ isApplied, styles }) => {
      store.isApplied = isApplied;
      if (ids) {
        const styleMap = styles.reduce((map, style) => {
          map[style.props.id] = style;
          return map;
        }, {});
        ids.forEach(id => {
          const style = styleMap[id];
          const i = store.styles.findIndex(item => item.props.id === id);
          if (i < 0) {
            if (style) store.styles.push(style);
          } else if (style) {
            store.styles[i] = style;
          } else {
            store.styles.splice(i, 1);
          }
        });
      } else {
        store.styles = styles;
      }
      store.ids = styles.map(({ props: { id } }) => id);
      applyStyles();
    });
  }
  function applyStyles() {
    let { styleEl } = store;
    if (store.isApplied) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        store.styleEl = styleEl;
        (document.head || document.documentElement).appendChild(styleEl);
      }
      styleEl.textContent = store.styles.map(({ css }) => css).filter(Boolean).join('\n');
    } else if (styleEl) {
      const { parentNode } = styleEl;
      if (parentNode) parentNode.removeChild(styleEl);
      store.styleEl = null;
    }
  }
}());

function initUserstylesOrg() {
  let styleId;
  sendMessage({ cmd: 'CheckStyle', data: { url: getMeta('stylish-id-url') } })
  .then(style => {
    if (!style) {
      sendEvent('styleCanBeInstalledChrome');
    } else {
      styleId = style.id;
      const { originalMd5 } = style.meta;
      return request(getMeta('stylish-md5-url'))
      .then(({ data: md5 }) => {
        sendEvent(originalMd5 === md5 ? 'styleAlreadyInstalledChrome' : 'styleCanBeUpdatedChrome');
      });
    }
  });

  document.addEventListener('stylishInstallChrome', onInstall);
  document.addEventListener('stylishUpdateChrome', onInstall);

  function onInstall() {
    sendMessage({
      cmd: 'ConfirmInstall',
      data: {
        type: styleId ? 'update' : 'install',
        desc: objectGet(document.querySelector(getMeta('stylish-description')), ['textContent']),
      },
    })
    .then(message => {
      // eslint-disable-next-line no-alert
      if (!window.confirm(message)) return Promise.reject();
      return getPayload(styleId);
    })
    .then(payload => sendMessage({ cmd: 'ParseStyle', data: payload }))
    .then(() => {
      sendEvent('styleInstalledChrome');
    });
  }
}

function getPayload(id) {
  return request(getMeta('stylish-code-chrome'), { responseType: 'json' })
  .then(({ data }) => ({ id, raw: data }));
}
