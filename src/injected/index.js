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

  let ids = [];

  let styleEl;
  sendMessage({ cmd: 'GetInjected', data: window.location.href })
  .then(({ isApplied, styles }) => {
    if (isApplied) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        (document.head || document.documentElement).appendChild(styleEl);
      }
      ids = styles.map(({ props: { id } }) => id);
      styleEl.textContent = styles.map(({ css }) => css).filter(Boolean).join('\n');
    } else if (styleEl) {
      const { parentNode } = styleEl;
      if (parentNode) parentNode.removeChild(styleEl);
      styleEl = null;
    }
  });

  window.setPopup = () => {
    if (IS_TOP) {
      sendMessage({
        cmd: 'SetPopup',
        data: { ids },
      });
    }
  };

  if (window.location.href.startsWith('https://userstyles.org/')) {
    document.addEventListener('DOMContentLoaded', initUserstylesOrg, false);
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

  const desc = objectGet(getMeta('stylish-description'), ['textContent']);

  document.addEventListener('stylishInstallChrome', onInstall);
  document.addEventListener('stylishUpdateChrome', onInstall);

  function onInstall() {
    sendMessage({ cmd: 'ConfirmInstall', data: { type: styleId ? 'update' : 'install', desc } })
    .then(message => {
      if (!confirm(message)) return Promise.reject();
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
  .then(({ data }) => {
    const { sections, ...meta } = data;
    return { id, sections, meta };
  });
}
