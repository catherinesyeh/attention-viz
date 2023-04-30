<template>
  <nav class="navbar navbar-light bg-light">
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1">Attention Viz</span>
      <div class="dropdown">
        <label for="layernum" style="margin-left: 0">Zoom to Layer</label>
        <a-tooltip placement="bottomRight">
          <template #title>
            <span>explore a single attention head by selecting a layer and head number</span>
          </template>
          <font-awesome-icon icon="info" class="info-icon" />
        </a-tooltip>
        <a-select ref="layer-select" v-model:value="layernum" style="width: 60px" :layerNum="layernum"
          @change="handleChange('layer', layernum)">
          <a-select-option v-for="i in 12" :value="i - 1">{{ i - 1 }}</a-select-option>
        </a-select>
        <label for="headnum">Head</label>
        <a-select ref="head-select" v-model:value="headnum" style="width: 60px" :headNum="headnum"
          @change="handleChange('head', headnum)">
          <a-select-option v-for="i in 12" :value="i - 1">{{ i - 1 }}</a-select-option>
        </a-select>
        <a-button type="primary" id="zoom-go" @click="zoomToPlot"> go </a-button>
        <a-button type="text" class="matrix-reset" @click="onClickReset">
          reset zoom
        </a-button>
        <a-button type="text" class="matrix-reset" @click="resetToMatrix" :class="{
            disabled: mode == 'matrix'
          }">
          view all heads
        </a-button>
      </div>
      <div class="dropdown">
        <a-button type="text" class="matrix-reset" @click="showModal" style="margin-left: 0">
          about
        </a-button>
        <a-modal v-model:visible="modalVisible" width="550px" title="About Attention Viz" @ok="closeModal">
          <p><b>Attention Viz</b> is an interactive tool that visualizes global attention patterns for transformer
            models. To create this tool, we visualize the joint embeddings of <b class="green">query</b>
            and <b class="pink">key</b> vectors. Click a
            button below to learn more.</p>
          <div class="modal-buttons">

            <a-button type="primary" id="docs-link" href="https://catherinesyeh.github.io/attn-docs/"
              target="_blank">Documentation</a-button>
            <a-button type="primary" id="paper-link" class="disabled">arXiv Preprint: Coming Soon!</a-button>
            <a-button type="primary" id="close-link" @click="closeModal">Jump Right In</a-button>
          </div>
        </a-modal>
        <Transition>
          <font-awesome-icon :icon="icon" @click="toggleTheme" />
        </Transition>
      </div>
    </div>
  </nav>
  <div class="main">
    <div class="row">
      <div :class="{ 'col-10': showAttn && view == 'attn', 'col-12': !showAttn || view != 'attn' }">
        <Projection ref="projection" />
      </div>
      <Transition>
        <div v-show="showAttn && view == 'attn'" class="col-2" id="attn-div">
          <AttnMapWrapper id="attn-wrap" />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script lang="ts">
import "bootstrap/dist/css/bootstrap.css";

import { defineComponent } from "vue";
import { useStore } from "@/store/index";

import Projection from "./Projection/Projection.vue";
import AttnMapWrapper from "./AttnMap/AttnMapWrapper.vue";

import { onMounted, computed, reactive, toRefs, h, watch, ref } from "vue";

export default defineComponent({
  name: "App",
  components: { Projection, AttnMapWrapper },
  setup() {
    const store = useStore();

    const projection = ref(null);

    const state = reactive({
      storeLayer: computed(() => store.state.layer),
      storeHead: computed(() => store.state.head),
      layernum: "" as string | number,
      headnum: "" as string | number,
      mode: computed(() => store.state.mode),
      view: computed(() => store.state.view),
      userTheme: computed(() => store.state.userTheme),
      icon: "moon",
      modalVisible: true,
      showAttn: computed(() => store.state.showAttn)
    });

    // Init the store to read data from backend
    onMounted(async () => {
      await store.dispatch("init");
    });

    // update graph settings based on dropdown option selected
    const handleChange = function (type: string, value: any) {
      if (type == "layer") {
        state.layernum = value;
      } else {
        state.headnum = value;
      }
    };

    // zoom to plot based on layer and head selected
    const zoomToPlot = () => {
      let layer = state.layernum;
      let head = state.headnum;
      (projection.value as any).zoomToPlot(layer, head);
    };

    const onClickReset = () => {
      (projection.value as any).onClickReset();
    };

    const resetToMatrix = () => {
      (projection.value as any).resetToMatrix();
    };

    // switch between light and dark mode
    const toggleTheme = () => {
      console.log("toggle theme");
      const activeTheme = localStorage.getItem("user-theme");
      if (activeTheme === "light-theme") {
        setTheme("dark-theme");
      } else {
        setTheme("light-theme");
      }
    }

    const getTheme = () => {
      console.log("get theme");
      return localStorage.getItem("user-theme");
    }

    const setTheme = (theme: string) => {
      console.log("set theme");
      localStorage.setItem("user-theme", theme);
      document.documentElement.className = theme;
      store.commit('setUserTheme', theme);

      if (theme == 'dark-theme') {
        state.icon = "sun";
      } else {
        state.icon = "moon";
      }
    };

    const getMediaPreference = () => {
      console.log("getMediaPreference");
      const hasDarkPreference = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (hasDarkPreference) {
        return "dark-theme";
      } else {
        return "light-theme";
      }
    };

    // show modal
    const showModal = () => {
      state.modalVisible = true;
    }

    const closeModal = () => {
      state.modalVisible = false;
    }


    watch([() => state.storeHead, () => state.storeLayer],
      () => {
        state.layernum = state.storeLayer;
        state.headnum = state.storeHead;
      }

    );

    return {
      ...toRefs(state),
      projection,
      handleChange,
      zoomToPlot,
      onClickReset,
      resetToMatrix,
      toggleTheme,
      getTheme,
      setTheme,
      getMediaPreference,
      closeModal,
      showModal
    };
  },
});
</script>

<style rel="stylesheet" lang="scss">
@import url("https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap");

:root {
  --background: #ffffff;
  --blue: #263459;
  --color1: #96351e;
  --color2: #dbb98f;
  --query: #c2e8b4;
  --query-dark: #9dd887;
  --query-label: #54943d;
  --key: #f0b3c7;
  --key-dark: #ea8aaa;
  --key-label: #c15b7d;
  --text: #1d1d1f;
  --navbar: #f8f9fa;
  --button: black;
  --radio: white;
  --radio-invert: white;
  --radio-border: #d9d9d9;
  --radio-hover: rgba(0, 0, 0, 0.85);
  --token-hover: lightgrey;
  --info: #777;
}

:root.dark-theme {
  --background: black;
  --text: white;
  --navbar: #222;
  --button: #222;
  --radio: #222;
  --radio-invert: black;
  --radio-border: #999;
  --radio-hover: rgba(255, 255, 255, 0.85);
  --token-hover: #222;
  --query-label: #c2e8b4;
  --key-label: #f0b3c7;
  --info: white;
}

::selection {
  background: #888 !important;
}

html,
body {
  overflow-y: hidden;
  overflow-x: hidden;

  width: 100vw;

  font-family: "Roboto", sans-serif;
  font-size: 16px;
  background: var(--background);

  color: var(--text);
}

@keyframes loading {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

#loading {
  position: absolute;
  padding: 40px;
  transition: 0.5s;
  width: 100%;
  text-align: center;
  transition: 0.5s;
}

#loading p:first-child {
  animation: loading 2s infinite;
}

#loading p:not(:first-child) {
  font-size: smaller;
  font-style: italic;
}

.hide {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  height: 0 !important;
  width: 0 !important;
  transform: scale(0) !important;
  line-height: 0 !important;
}

nav.navbar {
  background: var(--navbar) !important;
  z-index: 10;
}

.navbar-brand {
  color: var(--text) !important;
}

.matrix-reset {
  color: var(--text) !important;
}

label {
  margin-right: 5px;
  margin-left: 10px;
}

.deck-tooltip {
  margin-top: calc(-15px - 0.75vh);
  z-index: 999 !important;
}

@media (max-height:800px) {
  .deck-tooltip {
    margin-top: -15px;
  }
}

.deck-tooltip .query {
  color: var(--query);
}

.deck-tooltip .key {
  color: var(--key);
}

.green {
  color: rgb(95, 185, 108);
}

.pink {
  color: rgb(227, 55, 143);
}

/* ant elements */
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.dropdown .ant-btn {
  margin-left: 10px;
}

.ant-radio-group {
  font-size: small;
}

.ant-radio-button-wrapper {
  background: var(--radio-invert) !important;
  border-color: var(--radio-border) !important;
  color: var(--text) !important;
}

.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
  background: var(--radio) !important;
  border-color: var(--text) !important;
}

.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)::before {
  background-color: var(--text) !important;
}

.ant-radio-button-wrapper:hover {
  color: var(--radio-hover) !important;
}

.anticon {
  vertical-align: 0 !important;
}

.ant-btn-primary {
  background: var(--button) !important;
  border-color: var(--button) !important;
}

#zoom-go {
  background: black !important;
  border-color: black !important;
}

.ant-btn-text {
  font-family: monospace !important;
  font-size: small;
}

.ant-input-search {
  width: 235px;
}

.ant-input {
  font-size: small;
  padding: 5px 11px;
}

.ant-input:hover {
  border-color: #d9d9d9 !important;
}

.ant-input:focus {
  border-color: var(--button) !important;
}

.ant-btn:not([disabled]):hover {
  opacity: 0.8;
}

.ant-select {
  font-size: small;
}

.ant-select:not(.ant-select-disabled):hover .ant-select-selector {
  border-color: #d9d9d9 !important;
}

.ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
  color: white !important;
  font-weight: unset !important;
  background-color: var(--button) !important;
}

.ant-select-focused:not(.ant-select-disabled).ant-select:not(.ant-select-customize-input) .ant-select-selector {
  border-color: var(--button) !important;
}

.ant-select-dropdown {
  z-index: 9999 !important;
}

.ant-checkbox-wrapper {
  font-size: smaller !important;
  color: var(--text);
  transition: 0.5s;
}

.ant-checkbox-wrapper.disabled,
.ant-btn.disabled,
.info-icon.disabled {
  opacity: 0.5;
  pointer-events: none !important;
}

.ant-checkbox-wrapper:hover .ant-checkbox-inner {
  border-color: #d9d9d9 !important;
}

.ant-checkbox-input:focus+.ant-checkbox-inner,
.ant-checkbox-checked::after {
  border-color: var(--button) !important;
}

.ant-checkbox-checked .ant-checkbox-inner {
  background-color: var(--button) !important;
  border-color: var(--button) !important;
}

.ant-btn-default:hover {
  color: var(--button) !important;
  border-color: var(--button) !important;
}

.ant-btn-default:active,
.ant-btn-default:focus {
  color: initial !important;
  border-color: initial !important;
}

/* icons */
.dropdown .svg-inline--fa {
  margin-left: 10px;
  cursor: pointer;
  transition: 0.5s;
  width: 16px !important;
  height: 16px !important;
}

.dropdown .svg-inline--fa:hover {
  opacity: 0.8;
}

// tooltip
.ant-tooltip {
  z-index: 10000 !important;
}

.ant-tooltip-inner {
  color: var(--navbar) !important;
  padding: 8px 15px !important;
  font-size: smaller;
}

.ant-tooltip-inner ul {
  margin-bottom: 0px !important;
  padding-left: 1rem !important;
}

.ant-tooltip-placement-bottomRight .ant-tooltip-arrow,
.ant-tooltip-placement-topRight .ant-tooltip-arrow {
  right: 0px !important;
}

.ant-tooltip-placement-bottomLeft .ant-tooltip-arrow,
.ant-tooltip-placement-topLeft .ant-tooltip-arrow {
  left: 0px !important;
}

.ant-tooltip-placement-leftTop .ant-tooltip-arrow,
.ant-tooltip-placement-rightTop .ant-tooltip-arrow {
  top: 0px !important;
}

.ant-tooltip-placement-rightBottom .ant-tooltip-arrow,
.ant-tooltip-placement-leftBottom .ant-tooltip-arrow {
  bottom: 0px !important;
}

.info-icon,
.dropdown .info-icon {
  border-radius: 100%;
  color: var(--info);
  border: 1px solid var(--info);
  padding: 1px;
  width: 8px !important;
  height: 8px !important;
  margin-right: 4px !important;
  transform: translateY(-6px) !important;
  outline: none !important;
  transition: 0.5s;
  margin-left: 0 !important;
}

#label-wrapper .info-icon,
#attn-wrap .info-icon,
#num-msg .info-icon,
.info-icon.first {
  margin-left: 4px !important;
  cursor: pointer;
}

#label-wrapper .label .info-icon {
  transform: translateY(-4px) !important;
}

#num-msg .info-icon {
  transform: translateY(-1px) !important;
}

.info-icon.first {
  margin-right: 0 !important;
  transform: translateY(-8px) !important;
}

.info-icon:hover {
  opacity: 0.8;
}

/* modal */
.ant-modal-mask {
  z-index: 9999 !important;
}

.ant-modal-wrap {
  z-index: 10000 !important;
}

.ant-modal-footer {
  display: none !important;
}

.modal-buttons .ant-btn:not(:first-child) {
  margin-left: 10px;
}

@media (max-width:540px) {
  .modal-buttons .ant-btn {
    display: block;
    margin: auto !important;
    width: 100%;
  }

  .modal-buttons .ant-btn:not(:first-child) {
    margin-top: 10px !important;
  }
}

// attn div
#attn-div {
  position: relative;
  z-index: 10;
  background-color: var(--background);
  padding-left: 0;
  display: flex;
  justify-content: flex-end;
}
</style>
