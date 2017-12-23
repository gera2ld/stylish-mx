<template>
  <div class="page-popup">
    <div class="logo" :class="{disabled:!options.isApplied}">
      <img src="/icons/icon_64.png">
    </div>
    <div class="menu-item" :class="{disabled:!options.isApplied}" @click="onToggle">
      <icon :name="getSymbolCheck(options.isApplied)"></icon>
      <span v-text="options.isApplied ? i18n('menuStyleEnabled') : i18n('menuStyleDisabled')"></span>
    </div>
    <div class="menu">
      <div class="menu-item" @click="onManage">
        <icon name="cog"></icon>
        <span v-text="i18n('menuDashboard')"></span>
      </div>
    </div>
    <div class="menu menu-domains" v-if="currentUrl" :class="{expand: activeMenu === 'domains'}">
      <div class="menu-item" target="_blank" @click="onFindStyles">
        <icon name="search"></icon>
        <span v-text="i18n('menuFindStyles')"></span>
      </div>
    </div>
    <div class="menu menu-styles" v-show="styles.length" :class="{expand: activeMenu === 'styles'}">
      <div class="menu-item" @click="toggleMenu('styles')">
        <icon name="more" class="icon-right icon-collapse"></icon>
        <span v-text="i18n('menuMatchedStyles')"></span>
      </div>
      <div class="submenu">
        <div class="menu-item" v-for="item in styles" @click="onToggleStyle(item)" :class="{disabled:!item.data.config.enabled}">
          <icon :name="getSymbolCheck(item.data.config.enabled)" class="icon-right"></icon>
          <span v-text="item.name"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import options from 'src/common/options';
import { objectGet } from 'src/common/object';
import { sendMessage } from 'src/common';
import Icon from 'src/common/ui/icon';
import { store } from '../utils';

const optionsData = {
  isApplied: options.get('isApplied'),
};
options.hook(changes => {
  if ('isApplied' in changes) {
    optionsData.isApplied = changes.isApplied;
  }
});

export default {
  components: {
    Icon,
  },
  data() {
    return {
      store,
      options: optionsData,
      activeMenu: 'styles',
    };
  },
  computed: {
    styles() {
      return this.store.styles.map(style => ({
        name: style.meta.name,
        data: style,
      }));
    },
    currentUrl() {
      return objectGet(this.store.currentSrc, 'tab.url');
    },
  },
  methods: {
    toggleMenu(name) {
      this.activeMenu = this.activeMenu === name ? null : name;
    },
    getSymbolCheck(bool) {
      return `toggle-${bool ? 'on' : 'off'}`;
    },
    onToggle() {
      options.set('isApplied', !this.options.isApplied);
    },
    onManage() {
      browser.runtime.openOptionsPage();
    },
    onCommand(item) {
      browser.__send(this.store.currentSrc.id, {
        cmd: 'Command',
        data: item.name,
      });
    },
    onToggleStyle(item) {
      const { data } = item;
      const enabled = !data.config.enabled;
      sendMessage({
        cmd: 'UpdateStyleInfo',
        data: {
          id: data.props.id,
          config: { enabled },
        },
      })
      .then(() => {
        data.config.enabled = enabled;
      });
    },
    onFindStyles() {
      browser.tabs.create({
        url: `https://userstyles.org/styles/browse/all/${encodeURIComponent(this.currentUrl)}`,
      });
    },
  },
};
</script>

<style src="../style.css"></style>
