<template>
  <section>
    <h3 v-text="i18n('labelDataExport')"></h3>
    <div class="export-list">
      <div class="ellipsis" v-for="item in items"
        :class="{active: item.active}"
        @click="item.active = !item.active"
        v-text="getName(item)">
      </div>
    </div>
    <button v-text="i18n('buttonAllNone')" @click="toggleSelection()"></button>
    <button v-text="i18n('buttonExportData')" @click="exportData" :disabled="exporting"></button>
  </section>
</template>

<script>
import { sendMessage } from 'src/common';
import SettingCheck from 'src/common/ui/setting-check';
import { store } from '../../utils';

export default {
  components: {
    SettingCheck,
  },
  data() {
    return {
      store,
      exporting: false,
      items: [],
    };
  },
  watch: {
    'store.styles': 'initItems',
  },
  computed: {
    selectedIds() {
      return this.items.filter(item => item.active).map(item => item.style.props.id);
    },
  },
  created() {
    this.initItems();
  },
  methods: {
    initItems() {
      this.items = (store.styles || [])
      .filter(({ config: { removed } }) => !removed)
      .map(style => ({
        style,
        active: true,
      }));
    },
    toggleSelection() {
      if (!store.styles.length) return;
      const active = this.selectedIds.length < store.styles.length;
      this.items.forEach(item => { item.active = active; });
    },
    exportData() {
      this.exporting = true;
      Promise.resolve(exportData(this.selectedIds))
      .then(downloadBlob)
      .catch(err => {
        console.error(err);
      })
      .then(() => {
        this.exporting = false;
      });
    },
    getName(item) {
      return item.style.meta.name;
    },
  },
};

function getWriter() {
  return new Promise(resolve => {
    zip.createWriter(new zip.BlobWriter(), writer => {
      resolve(writer);
    });
  });
}

function addFile(writer, file) {
  return new Promise(resolve => {
    writer.add(file.name, new zip.TextReader(file.content), () => {
      resolve(writer);
    });
  });
}

function leftpad(src, length, pad = '0') {
  let str = `${src}`;
  while (str.length < length) str = pad + str;
  return str;
}

function getTimestamp() {
  const date = new Date();
  return `${
    date.getFullYear()
  }-${
    leftpad(date.getMonth() + 1, 2)
  }-${
    leftpad(date.getDate(), 2)
  }_${
    leftpad(date.getHours(), 2)
  }.${
    leftpad(date.getMinutes(), 2)
  }.${
    leftpad(date.getSeconds(), 2)
  }`;
}

function getExportname() {
  return `styles_${getTimestamp()}.zip`;
}

function download(url, cb) {
  const a = document.createElement('a');
  a.style.display = 'none';
  document.body.appendChild(a);
  a.href = url;
  a.download = getExportname();
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    if (cb) cb();
  }, 3000);
}

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob);
  download(url, () => {
    URL.revokeObjectURL(url);
  });
}

function exportData(selectedIds) {
  if (!selectedIds.length) return;
  return sendMessage({
    cmd: 'ExportZip',
    data: {
      ids: selectedIds,
    },
  })
  .then(data => {
    const names = {};
    const files = data.items.map(style => {
      let name = style.meta.name || style.props.id;
      if (names[name]) {
        names[name] += 1;
        name = `${name}_${names[name]}`;
      } else names[name] = 1;
      const content = JSON.stringify({
        meta: style.meta,
        sections: style.sections,
      });
      return {
        name: `${name}.json`,
        content,
      };
    });
    return files;
  })
  .then(files => files.reduce((result, file) => (
    result.then(writer => addFile(writer, file))
  ), getWriter()))
  .then(writer => new Promise(resolve => {
    writer.close(blob => {
      resolve(blob);
    });
  }));
}
</script>

<style>
.export-list {
  display: block;
  min-height: 4rem;
  max-height: 20rem;
  overflow-y: auto;
  padding: .3rem;
  white-space: normal;
  border: 1px solid #ddd;
  > .ellipsis {
    display: inline-block;
    width: 13rem;
    max-width: 100%;
    line-height: 1.5;
    margin-right: .2rem;
    margin-bottom: .1rem;
    padding: 0 .3rem;
    border: 1px solid #bbb;
    border-radius: 3px;
    cursor: pointer;
    &.active {
      border-color: #2c82c9;
      background: #3498db;
      color: white;
    }
  }
}
</style>
