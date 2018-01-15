import { i18n, request } from 'src/common';
import { parseStyle } from './db';

const processes = {};

function doCheckUpdate(style) {
  const update = {
    checking: true,
  };
  const res = {
    cmd: 'UpdateStyle',
    data: {
      where: {
        id: style.props.id,
      },
      update,
    },
  };
  const downloadURL = style.meta.updateUrl;
  const updateURL = style.meta.md5Url;
  const okHandler = ({ data }) => {
    if (data !== style.meta.originalMd5) return Promise.resolve();
    update.checking = false;
    update.message = i18n('msgNoUpdate');
    browser.runtime.sendMessage(res);
    return Promise.reject();
  };
  const errHandler = () => {
    update.checking = false;
    update.message = i18n('msgErrorFetchingUpdateInfo');
    browser.runtime.sendMessage(res);
    return Promise.reject();
  };
  const doUpdate = () => {
    update.message = i18n('msgUpdating');
    browser.runtime.sendMessage(res);
    return request(downloadURL, {
      responseType: 'json',
    })
    .catch(() => {
      update.checking = false;
      update.message = i18n('msgErrorFetchingStyle');
      browser.runtime.sendMessage(res);
      return Promise.reject();
    });
  };
  if (!updateURL) return Promise.reject();
  update.message = i18n('msgCheckingForUpdate');
  browser.runtime.sendMessage(res);
  return request(updateURL)
  .then(okHandler, errHandler)
  .then(doUpdate);
}

export default function checkUpdate(style) {
  const { id } = style.props;
  let promise = processes[id];
  if (!promise) {
    let updated = false;
    promise = doCheckUpdate(style)
    .then(({ data: raw }) => parseStyle({ id, raw }))
    .then(res => {
      const { data: { update } } = res;
      update.checking = false;
      browser.runtime.sendMessage(res);
      updated = true;
    })
    .catch(err => {
      if (process.env.DEBUG) console.error(err);
    })
    .then(() => {
      delete processes[id];
      return updated;
    });
    processes[id] = promise;
  }
  return promise;
}
