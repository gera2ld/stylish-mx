<template>
  <div class="style" :class="{ disabled: !styleData.config.enabled, removed: styleData.config.removed }">
    <div class="style-info flex">
      <div class="style-name ellipsis" v-text="styleData.meta.name"></div>
      <div class="flex-auto"></div>
      <div v-if="styleData.config.removed" v-text="i18n('labelRemoved')"></div>
      <div v-if="styleData.config.removed">
        <tooltip :title="i18n('buttonUndo')" placement="left">
          <span class="btn-ghost" @click="onRemove(0)">
            <icon name="undo"></icon>
          </span>
        </tooltip>
      </div>
    </div>
    <div class="style-buttons flex">
      <tooltip :title="i18n('buttonEdit')" align="start">
        <span class="btn-ghost" @click="onEdit">
          <icon name="code"></icon>
        </span>
      </tooltip>
      <tooltip :title="labelEnable" align="start">
        <span class="btn-ghost" @click="onEnable">
          <icon :name="`toggle-${styleData.config.enabled ? 'on' : 'off'}`"></icon>
        </span>
      </tooltip>
      <tooltip :disabled="!canUpdate || styleData.checking" :title="i18n('buttonUpdate')" align="start">
        <span class="btn-ghost" @click="onUpdate">
          <icon name="refresh"></icon>
        </span>
      </tooltip>
      <span class="sep"></span>
      <tooltip :disabled="!homepageURL" :title="i18n('buttonHome')" align="start">
        <a class="btn-ghost" target="_blank" :href="homepageURL">
          <icon name="home"></icon>
        </a>
      </tooltip>
      <div class="flex-auto" v-text="styleData.message"></div>
      <tooltip :title="i18n('buttonRemove')" align="end">
        <span class="btn-ghost" @click="onRemove(1)">
          <icon name="trash"></icon>
        </span>
      </tooltip>
    </div>
  </div>
</template>

<script>
import Tooltip from 'vueleton/lib/tooltip';
import { sendMessage } from 'src/common';
import Icon from 'src/common/ui/icon';

export default {
  props: ['styleData'],
  components: {
    Icon,
    Tooltip,
  },
  computed: {
    canUpdate() {
      const { styleData } = this;
      return styleData.config.shouldUpdate && styleData.meta.updateUrl;
    },
    homepageURL() {
      const { styleData } = this;
      return styleData.meta.url;
    },
    labelEnable() {
      return this.styleData.config.enabled ? this.i18n('buttonDisable') : this.i18n('buttonEnable');
    },
  },
  methods: {
    onEdit() {
      this.$emit('edit', this.styleData.props.id);
    },
    onRemove(remove) {
      sendMessage({
        cmd: 'UpdateStyleInfo',
        data: {
          id: this.styleData.props.id,
          config: {
            removed: remove ? 1 : 0,
          },
        },
      });
    },
    onEnable() {
      sendMessage({
        cmd: 'UpdateStyleInfo',
        data: {
          id: this.styleData.props.id,
          config: {
            enabled: this.styleData.config.enabled ? 0 : 1,
          },
        },
      });
    },
    onUpdate() {
      sendMessage({
        cmd: 'CheckUpdate',
        data: this.styleData.props.id,
      });
    },
  },
};
</script>

<style>
.style {
  position: relative;
  margin: 8px;
  padding: 12px 10px 5px;
  border: 1px solid #ccc;
  border-radius: .3rem;
  transition: transform .5s;
  background: white;
  &:hover {
    border-color: darkgray;
  }
  .secondary {
    color: gray;
    font-size: small;
  }
  &.disabled,
  &.removed {
    background: #f0f0f0;
    color: #999;
  }
  &.disabled {
    .secondary {
      color: darkgray;
    }
  }
  &.removed {
    padding-bottom: 10px;
    .secondary {
      display: none;
    }
  }
  &-buttons {
    align-items: center;
    line-height: 1;
    color: #3e4651;
    > .flex-auto {
      margin-left: 1rem;
    }
    .removed & {
      display: none;
    }
    > .disabled {
      color: gainsboro;
    }
  }
  &-info {
    line-height: 1.5;
    align-items: center;
    > *:not(:last-child) {
      margin-right: 8px;
    }
  }
  &-icon {
    position: absolute;
    width: 3rem;
    height: 3rem;
    top: 1rem;
    .disabled &,
    .removed & {
      filter: grayscale(.8);
    }
    .removed & {
      width: 2rem;
      height: 2rem;
    }
  }
  &-name {
    font-weight: 500;
    font-size: 1rem;
    .disabled & {
      color: gray;
    }
  }
}
</style>
