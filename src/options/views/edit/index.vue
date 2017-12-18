<template>
  <div class="frame flex flex-col fixed-full">
    <div class="flex edit-header">
      <h2 v-text="i18n('labelStyleEditor')"></h2>
      <div class="flex-auto"></div>
      <div class="buttons">
        <button v-text="i18n('buttonSave')" @click="save" :disabled="!canSave"></button>
        <button v-text="i18n('buttonSaveClose')" @click="saveClose" :disabled="!canSave"></button>
        <button v-text="i18n('buttonClose')" @click="close"></button>
      </div>
    </div>
    <div class="frame-block flex-auto flex">
      <div class="edit-sections flex flex-col mr-1">
        <div class="mb-1">
          <label v-text="i18n('labelName')" />
          <input type="text" v-model="editData.meta.name" />
        </div>
        <div class="flex">
          <div class="edit-title flex-auto" v-text="i18n('labelSections')" />
          <span @click="onAddSection">
            <icon name="plus" />
          </span>
        </div>
        <ul class="flex-auto">
          <li
            v-for="(section, i) in editData.sections"
            :class="{active: active === i}">
            <div v-text="i + 1" @click="active = i"></div>
            <span class="edit-remove" @click="onRemoveSection(i)" v-if="editData.sections.length > 1">
              <icon name="trash" />
            </span>
          </li>
        </ul>
      </div>
      <div class="flex-auto flex flex-col">
        <div class="flex edit-rules mb-1">
          <div class="flex-auto mr-1">
            <div class="edit-title" v-text="i18n('labelDomains')" />
            <textarea v-model="current.domains" />
          </div>
          <div class="flex-auto mr-1">
            <div class="edit-title" v-text="i18n('labelRegExps')" />
            <textarea v-model="current.regexps" />
          </div>
          <div class="flex-auto mr-1">
            <div class="edit-title" v-text="i18n('labelUrlPrefixes')" />
            <textarea v-model="current.urlPrefixes" />
          </div>
          <div class="flex-auto">
            <div class="edit-title" v-text="i18n('labelUrls')" />
            <textarea v-model="current.urls" />
          </div>
        </div>
        <div class="flex-auto pos-rel">
          <vm-code
            class="abs-full"
            v-model="current.code" :commands="commands"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { i18n, sendMessage, noop } from 'src/common';
import { objectGet } from 'src/common/object';
import VmCode from 'src/common/ui/code';
import Icon from 'src/common/ui/icon';
import { showMessage } from '../../utils';

function fromList(list) {
  return (list || []).join('\n');
}
function toList(text) {
  return (text || '').split('\n')
  .map(line => line.trim())
  .filter(Boolean);
}

export default {
  props: ['initial'],
  components: {
    VmCode,
    Icon,
  },
  data() {
    return {
      canSave: false,
      styleData: null,
      editData: {
        meta: {},
        sections: [],
      },
      active: 0,
      commands: {
        save: this.save,
        close: this.close,
      },
    };
  },
  watch: {
    editData: {
      deep: true,
      handler() {
        this.canSave = true;
      },
    },
  },
  computed: {
    current() {
      return objectGet(this.editData, ['sections', this.active]) || {};
    },
  },
  created() {
    this.styleData = this.initial;
  },
  mounted() {
    const id = objectGet(this.styleData, 'props.id');
    (id
      ? Promise.resolve()
      : sendMessage({
        cmd: 'NewStyle',
      })
      .then(styleData => {
        this.styleData = styleData;
      })
    )
    .then(() => {
      this.editData = {
        meta: { ...this.styleData.meta },
        sections: this.styleData.sections.map(this.loadSection),
      };
      if (!this.editData.sections.length) this.onAddSection();
      this.$nextTick(() => {
        this.canSave = false;
      });
    });
  },
  methods: {
    loadSection(section) {
      const {
        domains, regexps, urlPrefixes, urls, code,
      } = section;
      return {
        domains: fromList(domains),
        regexps: fromList(regexps),
        urlPrefixes: fromList(urlPrefixes),
        urls: fromList(urls),
        code: code || '',
      };
    },
    save() {
      const sections = this.editData.sections.map(section => {
        const {
          domains, regexps, urlPrefixes, urls, code,
        } = section;
        return {
          domains: toList(domains),
          regexps: toList(regexps),
          urlPrefixes: toList(urlPrefixes),
          urls: toList(urls),
          code,
        };
      });
      const id = objectGet(this.styleData, 'props.id');
      return sendMessage({
        cmd: 'ParseStyle',
        data: {
          id,
          meta: this.editData.meta,
          sections,
          message: '',
        },
      })
      .then(res => {
        this.canSave = false;
        if (objectGet(res, 'where.id')) this.styleData = res.update;
      }, err => {
        showMessage({ text: err });
      });
    },
    close() {
      (this.canSave ? Promise.reject() : Promise.resolve())
      .catch(() => new Promise((resolve, reject) => {
        showMessage({
          input: false,
          text: i18n('confirmNotSaved'),
          buttons: [
            {
              text: i18n('buttonOK'),
              onClick: resolve,
            },
            {
              text: i18n('buttonCancel'),
              onClick: reject,
            },
          ],
          onBackdropClick: reject,
        });
      }))
      .then(() => this.$emit('close'), noop);
    },
    saveClose() {
      this.save().then(this.close);
    },
    onAddSection() {
      this.editData.sections.push(this.loadSection({}));
    },
    onRemoveSection(i) {
      this.editData.sections.splice(i, 1);
      if (this.active >= this.editData.sections.length) {
        this.active = this.editData.sections.length - 1;
      }
    },
  },
};
</script>

<style>
.edit {
  &-header {
    > * {
      padding: 8px;
    }
  }
  &-rules {
    textarea {
      height: 120px;
      word-break: break-all;
      resize: none;
    }
  }
  &-sections {
    width: 160px;
    > ul {
      background: white;
      border: 1px solid #999;
      overflow: auto;
    }
    li {
      position: relative;
      padding: 3px 8px;
      &.active {
        background: #eee;
      }
      .edit-remove {
        position: absolute;
        top: 6px;
        right: 8px;
      }
      &:not(:hover) .edit-remove {
        display: none;
      }
    }
  }
}
</style>
