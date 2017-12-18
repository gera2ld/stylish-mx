export default () => new Promise((resolve, reject) => {
  console.info('Upgrade database...');
  init();
  function init() {
    const req = indexedDB.open('Stylish', 1);
    req.onsuccess = () => {
      transform(req.result);
    };
    req.onerror = reject;
    req.onupgradeneeded = () => {
      // No available upgradation
      throw reject();
    };
  }
  function transform(db) {
    const tx = db.transaction(['styles']);
    const updates = {};
    getAllStyles(tx, items => {
      items.forEach(item => {
        updates[`stl:${item.props.id}`] = item;
      });
      resolve(browser.storage.local.set(updates));
    });
  }
  function getAllStyles(tx, callback) {
    const os = tx.objectStore('styles');
    const list = [];
    const req = os.openCursor();
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        const {
          value: {
            id, name, url, idUrl, md5Url, md5, updateUrl, enabled, data,
          },
        } = cursor;
        list.push({
          config: {
            enabled: enabled ? 1 : 0,
            shouldUpdate: 1,
          },
          props: {
            id,
          },
          meta: {
            url,
            name,
            idUrl,
            md5,
            md5Url,
            updateUrl,
          },
          sections: data,
        });
        cursor.continue();
      } else {
        callback(list);
      }
    };
  }
})
// Ignore error
.catch(() => {});
