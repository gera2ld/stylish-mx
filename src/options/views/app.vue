<template>
  <div class="page-options flex h-100">
    <aside>
      <img src="/icons/icon_64.png">
      <h1 v-text="i18n('extName')"></h1>
      <div class="sidemenu">
        <a href="#?t=Installed" :class="{active: tab === 'Installed'}" v-text="i18n('sideMenuInstalled')"></a>
        <a href="#?t=About" :class="{active: tab === 'About'}" v-text="i18n('sideMenuAbout')"></a>
      </div>
    </aside>
    <component :is="tab" class="tab flex-auto"></component>
  </div>
</template>

<script>
import { store } from '../utils';
import Installed from './tab-installed';
import About from './tab-about';

const tabs = {
  Installed,
  About,
};

export default {
  components: tabs,
  data() {
    return store;
  },
  computed: {
    tab() {
      let tab = this.route.query.t;
      if (!tabs[tab]) tab = 'Installed';
      return tab;
    },
  },
};
</script>

<style src="../style.css"></style>
