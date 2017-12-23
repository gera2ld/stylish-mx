import 'src/common/browser';
import { injectContent, i18n } from 'src/common';
import { objectGet } from 'src/common/object';
import {
  checkUpdate,
  getOption, setOption, hookOptions, getAllOptions,
  initialize, broadcast,
} from './utils';
import { newStyle } from './utils/style';
import {
  getStyles, removeStyle, getData, checkRemove, getStylesByURL,
  updateStyleInfo, getExportData,
  getStylesByIds, parseStyle, getStyle, parseFirefoxCss,
} from './utils/db';

hookOptions(changes => {
  if ('isApplied' in changes) {
    setIcon(changes.isApplied);
    broadcast({
      cmd: 'UpdateStyle',
      data: {
        isApplied: changes.isApplied,
      },
    });
  }
  // if ('showBadge' in changes) updateBadges();
  browser.runtime.sendMessage({
    cmd: 'UpdateOptions',
    data: changes,
  });
});

function checkUpdateAll() {
  setOption('lastUpdate', Date.now());
  getStyles()
  .then(styles => {
    const toUpdate = styles.filter(item => objectGet(item, 'config.shouldUpdate'));
    return Promise.all(toUpdate.map(checkUpdate));
  });
}

let autoUpdating;
function autoUpdate() {
  if (autoUpdating) return;
  autoUpdating = true;
  check();
  function check() {
    new Promise((resolve, reject) => {
      if (!getOption('autoUpdate')) return reject();
      if (Date.now() - getOption('lastUpdate') >= 864e5) resolve(checkUpdateAll());
    })
    .then(() => setTimeout(check, 36e5), () => { autoUpdating = false; });
  }
}

const commands = {
  NewStyle: newStyle,
  RemoveStyle: removeStyle,
  CheckUpdateAll: checkUpdateAll,
  CheckUpdate(id) {
    getStyle({ id }).then(checkUpdate);
  },
  AutoUpdate: autoUpdate,
  GetAllOptions: getAllOptions,
  GetOptions(data) {
    return data.reduce((res, key) => {
      res[key] = getOption(key);
      return res;
    }, {});
  },
  SetOptions(data) {
    const items = Array.isArray(data) ? data : [data];
    items.forEach(item => { setOption(item.key, item.value); });
  },
  ConfirmInstall({ desc }) {
    return i18n('msgConfirmInstall', [desc]);
  },
  GetData() {
    return checkRemove()
    .then(() => getData());
  },
  GetInjected({ url, ids }) {
    const data = {
      isApplied: getOption('isApplied'),
    };
    return getStylesByURL(url, ids)
    .then(styles => Object.assign(data, { styles }));
  },
  UpdateStyleInfo({ id, config }) {
    return updateStyleInfo(id, { config })
    .then(([style]) => {
      browser.runtime.sendMessage({
        cmd: 'UpdateStyle',
        data: {
          where: { id: style.props.id },
          update: style,
        },
      });
    });
  },
  ParseStyle(data) {
    return parseStyle(data).then(res => {
      browser.runtime.sendMessage(res);
      return res.data;
    });
  },
  ParseFirefoxCss(data) {
    return parseFirefoxCss(data).then(res => {
      browser.runtime.sendMessage(res);
      return res.data;
    });
  },
  CheckStyle({ url }) {
    return getStyle({ url })
    .then(style => style && { id: style.id, meta: style.meta });
  },
  GetMetas(ids) {
    return getStylesByIds(ids);
  },
  // SetBadge: setBadge,
  ExportZip({ ids }) {
    return getExportData(ids);
  },
};

initialize()
.then(() => {
  browser.runtime.onMessage.addListener((req, src) => {
    const func = commands[req.cmd];
    let res;
    if (func) {
      res = func(req.data, src);
      if (typeof res !== 'undefined') {
        // If res is not instance of native Promise, browser APIs will not wait for it.
        res = Promise.resolve(res)
        .then(data => ({ data }), error => {
          if (process.env.DEBUG) console.error(error);
          return { error };
        });
      }
    }
    return res || null;
  });
  setTimeout(autoUpdate, 2e4);
  checkRemove();
});

// REQUIRE tabId
// const badges = {};
// function setBadge({ ids, reset }, src) {
//   const srcTab = src.tab || {};
//   let data = !reset && badges[srcTab.id];
//   if (!data) {
//     data = {
//       unique: 0,
//       idMap: {},
//     };
//     badges[srcTab.id] = data;
//   }
//   if (ids) {
//     ids.forEach(id => {
//       data.idMap[id] = 1;
//     });
//     data.unique = Object.keys(data.idMap).length;
//   }
//   updateBadge(srcTab.id);
// }
// function updateBadge(tabId) {
//   const data = badges[tabId];
//   if (data) {
//     const showBadge = getOption('showBadge');
//     let text;
//     if (showBadge) text = data.unique;
//     browser.browserAction.setBadgeText({
//       text: `${text || ''}`,
//       tabId,
//     });
//   }
// }
// function updateBadges() {
//   browser.tabs.query({})
//   .then(tabs => {
//     tabs.forEach(tab => {
//       updateBadge(tab.id);
//     });
//   });
// }
// browser.tabs.onRemoved.addListener(id => {
//   delete badges[id];
// });

function setIcon(isApplied) {
  browser.browserAction.setIcon(`icon${isApplied ? '' : 'w'}`);
}
setIcon(getOption('isApplied'));

function onTabUpdate(tabId) {
  // Maxthon sucks
  // When ON_NAVIGATE is fired, the old context is actually alive and the new context
  // is not ready yet, so we cannot do anything with the new context here.
  // file:/// URLs will not be injected on Maxthon 5

  injectContent(`window.setTabId(${JSON.stringify(tabId)})`, tabId);
}

browser.tabs.onUpdated.addListener(onTabUpdate);
