import { i18n } from 'src/common';
import { objectGet } from 'src/common/object';
import { broadcast } from '.';
import { newStyle } from './style';
import { register } from './init';
import patchDB from './patch-db';

function ensureListArgs(handle) {
  return function handleList(data) {
    let items = Array.isArray(data) ? data : [data];
    items = items.filter(Boolean);
    if (!items.length) return Promise.resolve();
    return handle.call(this, items);
  };
}

const store = {};
const storage = {
  base: {
    prefix: '',
    getKey(id) {
      return `${this.prefix}${id}`;
    },
    getOne(id) {
      const key = this.getKey(id);
      return browser.storage.local.get(key).then(data => data[key]);
    },
    getMulti(ids, def) {
      return browser.storage.local.get(ids.map(id => this.getKey(id)))
      .then(data => {
        const result = {};
        ids.forEach(id => { result[id] = data[this.getKey(id)] || def; });
        return result;
      });
    },
    set(id, value) {
      if (!id) return Promise.resolve();
      return browser.storage.local.set({
        [this.getKey(id)]: value,
      });
    },
    remove(id) {
      if (!id) return Promise.resolve();
      return browser.storage.local.remove(this.getKey(id));
    },
    removeMulti(ids) {
      return browser.storage.local.remove(ids.map(id => this.getKey(id)));
    },
  },
};
storage.style = Object.assign({}, storage.base, {
  prefix: 'stl:',
  dump: ensureListArgs(function dump(items) {
    const updates = {};
    items.forEach(item => {
      updates[this.getKey(item.props.id)] = item;
      store.styleMap[item.props.id] = item;
    });
    broadcast({
      cmd: 'UpdateStyle',
      data: {
        ids: items.map(item => item.props.id),
      },
    });
    return browser.storage.local.set(updates)
    .then(() => items);
  }),
});

register(initialize());

function initialize() {
  return browser.storage.local.get('version')
  .then(({ version: lastVersion }) => {
    const { version } = browser.runtime.getManifest();
    return (lastVersion ? Promise.resolve() : patchDB())
    .then(() => {
      if (version !== lastVersion) return browser.storage.local.set({ version });
    });
  })
  .then(() => browser.storage.local.get())
  .then(data => {
    const styles = [];
    const storeInfo = {
      id: 0,
    };
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (key.startsWith('stl:')) {
        // {
        //   meta,
        //   props: { id, uri },
        //   config: { enabled, shouldUpdate },
        //   sections: [...],
        // }
        styles.push(value);
        storeInfo.id = Math.max(storeInfo.id, getInt(objectGet(value, 'props.id')));
      }
    });
    Object.assign(store, {
      styles,
      storeInfo,
      styleMap: styles.reduce((map, item) => {
        map[item.props.id] = item;
        return map;
      }, {}),
    });
    if (process.env.DEBUG) {
      console.log('store:', store); // eslint-disable-line no-console
    }
  });
}

function getInt(val) {
  return +val || 0;
}

export function getStyle(where) {
  let style;
  if (where.id) {
    style = store.styleMap[where.id];
  } else if (where.url) {
    style = store.styles.find(item => where.url === item.meta.url);
  }
  return Promise.resolve(style);
}

export function getStyles() {
  return Promise.resolve(store.styles);
}

export function getStylesByIds(ids) {
  return Promise.all(ids.map(id => getStyle({ id })))
  .then(styles => styles.filter(Boolean));
}

/**
 * @desc Get styles to be injected to page with specific URL.
 */
export function getStylesByURL(url, ids) {
  const domain = objectGet(url.match(/^[^:]*:\/\/([^/]*)/), [1]) || '';
  const idMap = ids && ids.reduce((map, id) => {
    map[id] = 1;
    return map;
  }, {});
  const items = store.styles
  .map(style => {
    if ((!idMap || idMap[style.props.id]) && !style.config.removed) {
      const sections = style.sections.filter(({
        domains, regexps, urlPrefixes, urls,
      }) => (
        // all empty matches all
        [domains, regexps, urlPrefixes, urls].every(({ length }) => !length)
        || domains.some(testDomain)
        || regexps.some(testRegexp)
        || urlPrefixes.some(testUrlPrefix)
        || urls.some(testUrl)
      ));
      if (sections.length) {
        const css = style.config.enabled && sections.map(({ code }) => code).join('\n');
        return { style, css };
      }
    }
    return null;
  }).filter(Boolean);
  const styles = items.map(({ style: { meta, config, props }, css }) => ({
    meta, config, props, css,
  }));
  return Promise.resolve(styles);

  function testDomain(rule) {
    return domain === rule || domain.endsWith(`.${rule}`);
  }
  function testRegexp(rule) {
    return RegExp(rule).test(url);
  }
  function testUrlPrefix(rule) {
    return url.startsWith(rule);
  }
  function testUrl(rule) {
    return url === rule;
  }
}

/**
 * @desc Get data for dashboard.
 */
export function getData() {
  return Promise.resolve({ styles: store.styles });
}

export function checkRemove() {
  const toRemove = store.styles.filter(style => style.config.removed);
  if (toRemove.length) {
    store.styles = store.styles.filter(style => !style.config.removed);
    const ids = toRemove.map(style => style.props.id);
    storage.style.removeMulti(ids);
  }
  return Promise.resolve(toRemove.length);
}

export function removeStyle(id) {
  const i = store.styles.findIndex(item => id === objectGet(item, 'props.id'));
  if (i >= 0) {
    store.styles.splice(i, 1);
    storage.style.remove(id);
  }
  browser.runtime.sendMessage({
    cmd: 'RemoveStyle',
    data: id,
  });
  return Promise.resolve();
}

function saveStyle(style) {
  const config = style.config || {};
  config.enabled = getInt(config.enabled);
  config.shouldUpdate = getInt(config.shouldUpdate);
  const props = style.props || {};
  let oldStyle;
  if (!props.id) {
    store.storeInfo.id += 1;
    props.id = store.storeInfo.id;
  } else {
    oldStyle = store.styleMap[props.id];
  }
  if (oldStyle) {
    style.config = Object.assign({}, oldStyle.config, config);
    style.props = Object.assign({}, oldStyle.props, props);
    const index = store.styles.indexOf(oldStyle);
    store.styles[index] = style;
  } else {
    style.config = config;
    style.props = props;
    store.styles.push(style);
  }
  style.sections = style.sections || [];
  return storage.style.dump(style);
}

export function updateStyleInfo(id, data) {
  const style = store.styleMap[id];
  if (!style) return Promise.reject();
  style.props = Object.assign({}, style.props, data.props);
  style.config = Object.assign({}, style.config, data.config);
  return storage.style.dump(style);
}

export function getExportData(ids) {
  const availableIds = ids.filter(id => {
    const style = store.styleMap[id];
    return style && !style.config.removed;
  });
  return Promise.all(availableIds.map(id => getStyle({ id })))
  .then(items => ({ items }));
}

export function parseStyle(data) {
  const {
    id, meta, message, config, props, sections,
  } = data;
  if (!meta.name) return Promise.reject(i18n('msgInvalidStyle'));
  const result = {
    cmd: 'UpdateStyle',
    data: {
      update: {
        message: message == null ? i18n('msgUpdated') : message || '',
      },
    },
  };
  return getStyle({ id, url: meta.url })
  .then(oldStyle => {
    let style;
    if (oldStyle) {
      style = Object.assign({}, oldStyle);
    } else {
      style = newStyle();
      result.cmd = 'AddStyle';
      result.data.update.message = i18n('msgInstalled');
    }
    style.config = Object.assign({}, style.config, config, {
      removed: 0, // force reset `removed` since this is an installation
    });
    style.props = Object.assign({}, style.props, {
      lastModified: Date.now(),
      lastUpdated: Date.now(),
    }, props);
    style.meta = meta;
    style.sections = sections;
    return saveStyle(style).then(() => style);
  })
  .then(style => {
    Object.assign(result.data.update, style);
    result.data.where = { id: style.props.id };
    return result;
  });
}

const whitelist = {
  url: 1,
  name: 1,
  idUrl: 1,
  md5Url: 1,
  md5: 1,
  updateUrl: 1,
};
const cssStart = '/* ==UserCSS==';
const cssEnd = '==/UserCSS== */';
const blockStart = '@-moz-document';
const typeMap = {
  domain: 'domains',
  regexp: 'regexps',
  'url-prefix': 'urlPrefixes',
  url: 'urls',
};
const INVALID = 'INVALID';
function throwInvalid() {
  throw new Error(INVALID);
}
function skipSpaceAndComments(str, k) {
  let skipped = true;
  let i = k;
  while (skipped) {
    skipped = false;
    // space
    for (; i < str.length && /\s/.test(str[i]); i += 1) {
      skipped = true;
    }
    // comments
    if (str[i] === '/') {
      skipped = true;
      if (str[i + 1] !== '*') throwInvalid();
      for (; i < str.length; i += 1) {
        if (str[i] === '*' && str[i + 1] === '/') break;
      }
      if (i === str.length) throwInvalid();
      i += 2;
    }
  }
  return [i];
}
function getRuleType(str, k) {
  let i;
  for (i = k; i < str.length && /[\w-]/.test(str[i]); i += 1);
  if (i === k || i === str.length) throwInvalid();
  return [i, str.slice(k, i)];
}
function getRuleValue(str, k) {
  if (str[k] !== '(') throwInvalid();
  let quote = str[k + 1];
  let i;
  let j = k + 1;
  if (!('\'"'.includes(quote))) quote = '';
  else j += 1;
  for (i = j; i < str.length; i += 1) {
    if (str[i] === '\\') i += 1;
    else if (quote && str[i] === quote || !quote && str[i] === ')') break;
  }
  if (i === str.length) throwInvalid();
  let value = str.slice(j, i);
  if (quote) {
    i += 1;
    if (quote === '"') value = JSON.parse(`"${value}"`);
  }
  if (str[i] !== ')') throwInvalid();
  return [i + 1, value];
}
function getRuleBody(str, k) {
  if (str[k] !== '{') throwInvalid();
  let count = 1;
  let i;
  for (i = k + 1; i < str.length && count; i += 1) {
    if (str[i] === '{') count += 1;
    else if (str[i] === '}') count -= 1;
  }
  if (count) throwInvalid();
  return [i, str.slice(k + 1, i - 1)];
}
export function parseFirefoxCss(data) {
  const { filename, code } = data;
  const meta = {
    name: filename,
  };
  const sections = [];
  let codeBlock = code;
  const i = code.indexOf(cssStart);
  const j = code.indexOf(cssEnd, i);
  if (i >= 0 && j >= 0) {
    const metaBlock = code.slice(i + cssStart.length, j);
    metaBlock.replace(/@(\w+)\s+(.*?)\n/g, (m, g1, g2) => {
      if (whitelist[g1]) meta[g1] = g2;
    });
    codeBlock = code.slice(0, i) + code.slice(j + cssEnd.length);
  }
  let k = 0;
  let blockStarted = false;
  let section;
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      [k] = skipSpaceAndComments(codeBlock, k);
      const char = codeBlock[k];
      if (!char) break;
      if (blockStarted) {
        if (char === '{') {
          const [k1, value] = getRuleBody(codeBlock, k);
          k = k1;
          blockStarted = false;
          section.code = value;
          sections.push(section);
          section = null;
        } else if (char === ',') {
          k += 1;
        } else {
          const [k1, type] = getRuleType(codeBlock, k);
          [k] = skipSpaceAndComments(codeBlock, k1);
          const [k2, value] = getRuleValue(codeBlock, k);
          k = k2;
          const list = section[typeMap[type]];
          if (list) list.push(value);
        }
      } else if (codeBlock.slice(k, k + blockStart.length) === blockStart) {
        blockStarted = true;
        k += blockStart.length;
        section = {
          domains: [],
          regexps: [],
          urlPrefixes: [],
          urls: [],
        };
      } else throwInvalid();
    }
  } catch (err) {
    if (err.message !== INVALID) throw err;
    return Promise.reject(i18n('msgInvalidStyle'));
  }
  return parseStyle({ meta, sections });
}
