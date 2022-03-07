<template>
  <div>
    <div :class="$style.header">
      <div :class="$style.back_title">
        <BaseButton v-if="isFarmsSyncPage"
                    :icon="IconName.ArrowLeft16"
                    size="s"
                    view="empty"
                    form="fab"
                    @click="back"/>
        <div v-text="syncSettingsHeaderText" :class="$style.header_text"/>
      </div>
      <BaseButton :icon="IconName.Close16"
                  size="s"
                  view="empty"
                  form="fab"
                  @click="closeSyncSettings"/>
    </div>
    <div :class="$style.divider"/>
  </div>
</template>

<script lang="ts">
export default defineComponent({
  name: 'SyncSettingsHeader',
  components: { BaseButton },
  setup () {
    return injectSynchronizationSettings();
  }
});
</script>

<style lang="scss" module>
.header {
  display: flex;
  padding: 1.2rem 1.6rem;
  justify-content: space-between;
}

.divider {
  background: $light-gray-ED-color;
  height: 0.1rem;
}

.back_title {
  display: flex;
  align-self: center;
}

.header_text {
  align-self: center;
  @include fontH4Bold;
}
</style>
