<template>
  <section>
    <h3 v-text="i18n('labelDataImport')"></h3>
    <button v-text="i18n('buttonImportData')" @click="importFile"></button>
  </section>
</template>

<script>
import { i18n, sendMessage } from 'src/common';
import { showMessage } from '../../utils';

export default {
  methods: {
    importFile() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.zip';
      input.onchange = () => {
        if (input.files && input.files.length) importData(input.files[0]);
      };
      input.click();
    },
  },
};

function loadFile(entry) {
  return new Promise(resolve => {
    const writer = new zip.TextWriter();
    const { filename } = entry;
    entry.getData(writer, text => {
      if (filename.endsWith('.json')) {
        let style;
        try {
          style = JSON.parse(text);
        } catch (err) {
          // ignore
        }
        const { meta, sections } = style || {};
        if (!Array.isArray(sections)) {
          resolve();
          return;
        }
        sendMessage({
          cmd: 'ParseStyle',
          data: { meta, sections },
        })
        .then(() => resolve(true), () => resolve());
      } else if (filename.endsWith('.user.css')) {
        sendMessage({
          cmd: 'ParseFirefoxCss',
          data: { filename: filename.slice(0, -9), code: text },
        })
        .then(() => resolve(true), () => resolve());
      } else {
        resolve();
      }
    });
  });
}

function readZip(file) {
  return new Promise((resolve, reject) => {
    zip.createReader(new zip.BlobReader(file), res => {
      res.getEntries(entries => {
        resolve(entries);
      });
    }, err => { reject(err); });
  });
}

function importData(file) {
  readZip(file)
  .then(entries => Promise.all(entries.map(loadFile)))
  .then(res => res.filter(Boolean).length)
  .then(count => {
    showMessage({ text: i18n('msgImported', [count]) });
  });
}
</script>
