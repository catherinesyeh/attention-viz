<template>
  <nav class="navbar navbar-light bg-light">
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1">Attention Viz</span>
      <div class="dropdown">
        <a-tooltip placement="bottomLeft" color="var(--radio-hover)">
          <template #title>
            <span>explore a single attention head</span>
          </template>
          <font-awesome-icon icon="circle-info" class="info-icon first" />
        </a-tooltip>
        <label for="layernum">Zoom to Layer:</label>
        <a-select ref="layer-select" v-model:value="layernum" style="width: 60px" :layerNum="layernum"
          @change="handleChange('layer', layernum)">
          <a-select-option v-for="i in 12" :value="i - 1">{{ i - 1 }}</a-select-option>
        </a-select>
        <label for="headnum">Head:</label>
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
        <a-tooltip placement="bottomRight" color="var(--radio-hover)">
          <template #title>
            <span>transformer options:</span>
            <ul>
              <li v-for="option in modelOptions">
                <i>{{ option.value }}</i> (<span v-if="option.value.includes('vit')">vision</span>
                <span v-else>language</span>)
              </li>
            </ul>
          </template>
          <font-awesome-icon icon="circle-info" class="info-icon first" />
        </a-tooltip>
        <label for="model">Model:</label>
        <a-select v-model:value="modelType" style="width: 80px" :options="modelOptions">
        </a-select>

        <a-tooltip placement="bottomRight" color="var(--radio-hover)">
          <template #title>
            <span>projection methods for creating joint q-k embeddings</span>
          </template>
          <font-awesome-icon icon="circle-info" class="info-icon" />
        </a-tooltip>
        <label for="graph-type">Graph Type:</label>
        <a-select v-model:value="projectionMethod" style="width: 80px" :options="projectionMethods">
        </a-select>

        <a-tooltip placement="bottomRight" color="var(--radio-hover)">
          <template #title>
            <span>color encodings:</span>
            <ul>
              <li v-for="(item, key) in colorByDict">
                <i>{{ key }}</i>: {{ item }}
              </li>
            </ul>
          </template>
          <font-awesome-icon icon="circle-info" class="info-icon" />
        </a-tooltip>
        <label for="color-by">Color By:</label>
        <a-select v-model:value="colorBy" style="width: 130px" :options="colorByOptions">
        </a-select>
        <Transition>
          <font-awesome-icon :icon="icon" @click="toggleTheme" />
        </Transition>
      </div>
    </div>
  </nav>
  <div class="main">
    <div class="row">
      <div class="col-2" style="position:relative">
        <AttnMapWrapper id="attn-wrap" />
      </div>
      <div class="col-10">
        <Projection ref="projection" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import "bootstrap/dist/css/bootstrap.css";

import { defineComponent } from "vue";
import { useStore } from "@/store/index";

import UserPanel from "./UserPanel/UserPanel.vue";
import Projection from "./Projection/Projection.vue";
import AttnMap from "./AttnMap/AttnMap.vue";
import AttnMapWrapper from "./AttnMap/AttnMapWrapper.vue";

import { onMounted, computed, reactive, toRefs, h, watch, ref } from "vue";
import { keys } from "underscore";

export default defineComponent({
  name: "App",
  components: { UserPanel, Projection, AttnMap, AttnMapWrapper },
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

      modelType: computed({
        get: () => store.state.modelType,
        set: (v) => store.dispatch("switchModel", v)
      }),
      // modelOptions: ["vit-16", "vit-32", "bert", "gpt-2"].map((x) => (
      modelOptions: ["vit-32", "bert", "gpt-2"].map((x) => (
        { value: x, label: x }
      )),
      projectionMethod: computed({
        get: () => store.state.projectionMethod,
        set: (v) => store.commit("setProjectionMethod", v),
      }),
      projectionMethods: ["tsne", "umap", "pca"].map((x) => ({ value: x, label: x })),
      colorBy: computed({
        get: () => store.state.colorBy,
        set: (v) => store.commit("setColorBy", v),
      }),
      colorByOptions: [] as any,
      colorByDict: {} as any,
      userTheme: computed(() => store.state.userTheme),
      icon: "moon",
      doneLoading: computed(() => store.state.doneLoading)
    });

    // Init the store to read data from backend
    onMounted(async () => {
      await store.dispatch("init");
      // const initUserTheme = getTheme() || getMediaPreference();
      // setTheme(initUserTheme);
      switchColorOptions();
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

    const switchColorOptions = () => {
      // reset color options depending on model selected
      const curColorBy = state.colorBy;
      let color_opts = [];
      if (state.modelType == "bert" || state.modelType == "gpt-2") {
        color_opts = ["query_key", "position", "pos_mod_5", "punctuation", "embed_norm", "token_length", "sent_length"];
        state.colorByOptions = color_opts.map((x) => ({ value: x, label: x }));
        state.colorByDict = {
          "query_key": "token type, query or key",
          "position": "token position in sentence (normalized)",
          "pos_mod_5": "token position modulo 5 (unnormalized)",
          "punctuation": "punctuation vs. non-punctuation tokens",
          "embed_norm": "token embedding norm",
          "token_length": "# chars in token (normalized)",
          "sent_length": "# tokens in sentence (normalized)"
        }

      } else {
        color_opts = ["query_key", "qk_map", "row", "column", "no_outline"];
        state.colorByOptions = color_opts.map((x) => ({ value: x, label: x }));
        state.colorByDict = {
          "query_key": "token type, query or key (outline)",
          "qk_map": "token type, query or key (fill)",
          "row": "token row (fill)",
          "column": "token column (fill)",
          "no_outline": "original patch without q/k outline"
        }
      }
      if (!color_opts.includes(curColorBy)) {
        store.commit("setColorBy", "query_key");
      }
    }

    watch([() => state.storeHead, () => state.storeLayer],
      () => {
        state.layernum = state.storeLayer;
        state.headnum = state.storeHead;
      }

    );

    watch([() => state.modelType],
      () => {
        switchColorOptions()
      }
    )

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
      getMediaPreference
    };
  },
  computed: {
    // icon() {
    //   if (this.userTheme === 'dark-theme') {
    //     return ['fas', 'sun']
    //   } else {
    //     return ['fas', 'moon']
    //   }
    // }
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
  padding: 80px 0;
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

.dropdown .ant-btn,
#paper-link {
  margin-left: 10px;
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

.ant-tooltip-placement-bottomRight .ant-tooltip-arrow {
  right: 0px !important;
}

.ant-tooltip-placement-bottomLeft .ant-tooltip-arrow,
.ant-tooltip-placement-topLeft .ant-tooltip-arrow {
  left: 0px !important;
}

.ant-tooltip-placement-leftTop .ant-tooltip-arrow {
  top: 0px !important;
}

.info-icon,
.dropdown .info-icon {
  width: 12px !important;
  height: 12px !important;
  margin-right: -4px !important;
  transform: translateY(-6px) !important;
  outline: none !important;
}

#label-wrapper .info-icon,
#attn-wrap .info-icon {
  margin-right: 4px !important;
  cursor: pointer;
}

.info-icon.first {
  margin-left: 0 !important;
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
</style>
