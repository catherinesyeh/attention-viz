<template>
  <nav class="navbar navbar-light bg-light">
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1">Attention Viz</span>
      <div class="dropdown">
        <label for="graph-type">Graph Type:</label>
        <a-select ref="select" v-model:value="graphtype" style="width: 120px"
          @change="handleChange('graph', graphtype)">
          <a-select-option value="tsne">tsne</a-select-option>
          <a-select-option value="umap">umap</a-select-option>
        </a-select>
        <label for="color-by">Color By:</label>
        <a-select ref="select" v-model:value="colorby" style="width: 120px" @change="handleChange('color', colorby)">
          <a-select-option value="position">position</a-select-option>
          <a-select-option value="norm">norm</a-select-option>
        </a-select>
      </div>
    </div>

  </nav>
  <div class="main">
    <div class="row">
      <div class="col-2">
        <AttnMap />
      </div>
      <div class="col-10">
        <Projection />
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
import { SelectTypes } from 'ant-design-vue/es/select';

export default defineComponent({
  name: "App",
  components: { UserPanel, Projection, AttnMap },
  setup() {
    const store = useStore();

    const state = reactive({
      graphtype: "tsne",
      colorby: "position"
    });

    // Init the store to read data from backend
    onMounted(async () => {
      await store.dispatch("init");
    });

    // update graph settings based on dropdown option selected
    const handleChange = function (type: string, value: string) {
      if (type == "graph") {
        state.graphtype = value;
      } else {
        state.colorby = value;
      }
    };

    return {
      ...toRefs(state),
      handleChange
    };
  },
  computed: {},
});
</script>

<style rel="stylesheet" lang="scss">
@import url("https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap");

$background: #f5f5f7;
$blue: #263459;
$color1: #96351e;
$color2: #dbb98f;
$query: #c2e8b4;
$query-dark: #9dd887;
$key: #f0b3c7;
$key-dark: #ea8aaa;
$text: #1d1d1f;

html,
body {
  overflow-y: hidden;
  overflow-x: hidden;

  width: 100vw;

  font-family: "Roboto", sans-serif;
  font-size: 16px;
  background: $background;

  color: $text;
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
  color: $query;
}

.deck-tooltip .key {
  color: $key;
}

/* ant elements */
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

/* end ant */
</style>
