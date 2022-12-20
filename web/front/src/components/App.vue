<template>
  <nav class="navbar navbar-light bg-light">
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1">Attention Viz</span>
      <div class="dropdown">
        <label for="layernum">Zoom to Layer:</label>
        <a-select ref="select" v-model:value="layernum" style="width: 60px" @change="handleChange('layer', layernum)"
          :layerNum="layernum">
          <a-select-option v-for="i in 12" :value="i - 1">{{ i - 1 }}</a-select-option>
        </a-select>
        <label for="headnum">Head:</label>
        <a-select ref="select" v-model:value="headnum" style="width: 60px" @change="handleChange('head', headnum)"
          :headNum="headnum">
          <a-select-option v-for="i in 12" :value="i - 1">{{ i - 1 }}</a-select-option>
        </a-select>
        <a-button type="primary" id="zoom-go" @click="zoomToPlot"> go </a-button>
        <a-button type="text" id="matrix-reset" @click="onClickReset">
          reset zoom
        </a-button>
      </div>
      <div class="dropdown">
        <label for="graph-type">Graph Type:</label>
        <a-select v-model:value="projectionMethod" style="width: 120px" :options="projectionMethods">
        </a-select>

        <label for="color-by">Color By:</label>
        <a-select v-model:value="colorBy" style="width: 120px" :options="colorByOptions">
        </a-select>
        <Transition>
          <font-awesome-icon :icon="icon" @click="toggleTheme" />
        </Transition>
      </div>
    </div>
  </nav>
  <div class="main">
    <div class="row">
      <div class="col-2">
        <AttnMap />
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

import { onMounted, computed, reactive, toRefs, h, watch, ref } from "vue";
import { string } from "vue-types";
import { SelectTypes } from "ant-design-vue/es/select";
import { Typing } from "@/utils/typing";

export default defineComponent({
  name: "App",
  components: { UserPanel, Projection, AttnMap },
  setup() {
    const store = useStore();

    const projection = ref(null);

    const state = reactive({
      headnum: "",
      layernum: "",
      projectionMethod: computed({
        get: () => store.state.projectionMethod,
        set: (v) => store.commit("setProjectionMethod", v),
      }),
      projectionMethods: ["umap", "tsne"].map((x) => ({ value: x, label: x })),
      colorBy: computed({
        get: () => store.state.colorBy,
        set: (v) => store.commit("setColorBy", v),
      }),
      colorByOptions: ["position", "norm"].map((x) => ({ value: x, label: x })),
      userTheme: computed(() => store.state.userTheme)
    });

    // Init the store to read data from backend
    onMounted(async () => {
      await store.dispatch("init");
      const initUserTheme = getTheme() || getMediaPreference();
      setTheme(initUserTheme);
    });

    // update graph settings based on dropdown option selected
    const handleChange = function (type: string, value: string) {
      if (type == "layer") {
        state.layernum = value;
      } else {
        state.headnum = value;
      }
    };

    // zoom to plot based on layer and head selected
    const zoomToPlot = () => {
      let layer = parseInt(state.layernum);
      let head = parseInt(state.headnum);
      (projection.value as any).zoomToPlot(layer, head);
    };

    const onClickReset = () => {
      (projection.value as any).onClickReset();
    };

    // switch between light and dark mode
    const toggleTheme = () => {
      const activeTheme = localStorage.getItem("user-theme");
      if (activeTheme === "light-theme") {
        setTheme("dark-theme");
      } else {
        setTheme("light-theme");
      }
    }

    const getTheme = () => {
      return localStorage.getItem("user-theme");
    }

    const setTheme = (theme: string) => {
      localStorage.setItem("user-theme", theme);
      document.documentElement.className = theme;
      store.commit('setUserTheme', theme);
    };

    const getMediaPreference = () => {
      const hasDarkPreference = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (hasDarkPreference) {
        return "dark-theme";
      } else {
        return "light-theme";
      }
    };

    return {
      ...toRefs(state),
      projection,
      handleChange,
      zoomToPlot,
      onClickReset,
      toggleTheme,
      getTheme,
      setTheme,
      getMediaPreference
    };
  },
  computed: {
    icon() {
      if (this.userTheme === 'dark-theme') {
        return ['fas', 'sun']
      } else {
        return ['fas', 'moon']
      }
    }
  },
});
</script>

<style rel="stylesheet" lang="scss">
@import url("https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap");

:root {
  --background: #f5f5f7;
  --blue: #263459;
  --color1: #96351e;
  --color2: #dbb98f;
  --query: #c2e8b4;
  --query-dark: #9dd887;
  --key: #f0b3c7;
  --key-dark: #ea8aaa;
  --text: #1d1d1f;
}

:root.dark-theme {
  --background: black;
  --text: white;
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
  animation: loading 2s infinite;
  line-height: 50vh;
  transition: 0.5s;
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

.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
  color: black !important;
  background: white !important;
  border-color: black !important;
}

.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)::before {
  background-color: black !important;
}

.ant-radio-button-wrapper:hover {
  color: rgba(0, 0, 0, 0.85) !important;
}

.anticon {
  vertical-align: 0 !important;
}

.ant-btn-primary {
  background: black !important;
  border-color: black !important;
}

.ant-btn-text {
  font-family: monospace !important;
  font-size: small;
}

.ant-input:hover {
  border-color: #d9d9d9 !important;
}

.ant-input:focus {
  border-color: black !important;
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
  background-color: black !important;
}

.ant-select-focused:not(.ant-select-disabled).ant-select:not(.ant-select-customize-input) .ant-select-selector {
  border-color: black !important;
}

.ant-select-dropdown {
  z-index: 9999 !important;
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
</style>
