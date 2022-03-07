<template>
  <BaseModal :isShow="isSyncSettingOpened"
             :contentClass="$style.modal"
             :backdropClass="$style.backdrop"
             @close="closeSyncSettings">
    <div :class="$style.root">
      <SyncSettingsHeader/>

      <div v-scroll-shadow :class="{ [$style.with_button]: canShowButton }">
        <SyncSettingsContent v-if="!isFarmsSyncPage"/>
        <FarmsSyncSettings v-else/>
      </div>

      <div v-if="canShowButton" :class="$style.button_container">
        <BaseButton :text="buttonText"
                    :class="$style.button"
                    :isDisabled="isButtonDisabled"
                    :form="ButtonForm.REGULAR"
                    :view="ButtonView.PRIMARY"
                    @click="clickSyncSettingsButton"/>
      </div>
    </div>
  </BaseModal>
</template>

<script lang="ts">
export default defineComponent({
  name: 'SyncSettings',
  components: {
    SyncSettingsContent,
    SyncSettingsHeader,
    FarmsSyncSettings,
    BaseButton,
    BaseModal
  },
  directives: {
    ScrollShadow
  },
  setup () {
    return {
      ...provideSynchronizationSettings()
    };
  }
});
</script>

<style lang="scss" module>
.root {
  display: flex;
  width: 32rem;
  flex-direction: column;
}

.with_button {
  height: calc(100% - 19rem);
  scroll-behavior: smooth;
  overflow: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
}

.button_container {
  position: relative;
  display: flex;
  width: 100%;
  background: $white-color;
}

.button {
  align-self: center;
  height: 4rem;
  width: 90%;
  margin: 2.4rem 1.6rem 1.6rem;
}

.modal {
  position: absolute;
  overflow: unset;
  max-height: 100%;
  height: 100%;
  left: 0;
  top: 6rem;
  box-shadow: none;
}

.backdrop {
  left: 7.8rem;
}
</style>
