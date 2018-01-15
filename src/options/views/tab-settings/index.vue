<template>
  <div class="tab-settings">
    <h1 v-text="i18n('labelSettings')"></h1>
    <section>
      <h3 v-text="i18n('labelGeneral')"></h3>
      <div class="mb-1">
        <label>
          <setting-check name="autoUpdate" />
          <span v-text="i18n('labelAutoUpdate')"></span>
        </label>
      </div>
      <div class="mb-1">
        <label>
          <setting-check name="startReload" />
          <span v-text="i18n('labelStartReload')"></span>
        </label>
      </div>
      <!--
      <div class="mb-1">
        <label>
          <setting-check name="showBadge" />
          <span v-text="i18n('labelShowBadge')"></span>
        </label>
      </div>
      -->
    </section>
    <vm-import></vm-import>
    <vm-export></vm-export>
  </div>
</template>

<script>
import SettingCheck from 'src/common/ui/setting-check';
import VmImport from './vm-import';
import VmExport from './vm-export';

export default {
  components: {
    VmImport,
    VmExport,
    SettingCheck,
  },
};
</script>

<style>
.tab-settings {
  overflow-y: auto;
  textarea {
    height: 10em;
  }
}
</style>
