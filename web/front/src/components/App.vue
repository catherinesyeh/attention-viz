<template>
  <nav class="navbar navbar-light bg-light">
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1">Attention Viz</span>
    </div>
  </nav>
  <div class="main">
    <div class="row">
      <div class="col-2">
        <UserPanel />
      </div>
    <div class="col-10">
        <MatrixView />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import "bootstrap/dist/css/bootstrap.css";

import { defineComponent } from "vue";
import { useStore } from "@/store/index";

import UserPanel from "./UserPanel/UserPanel.vue";
import MatrixView from "./MatrixView/MatrixView.vue";

import { onMounted, computed, reactive, toRefs, h, watch } from "vue";

export default defineComponent({
    name: "App",
    components: { UserPanel, MatrixView },
    setup() {
        const store = useStore();

        const state = reactive({
        });

        // Init the store to read data from backend
        onMounted(async () => {
            await store.dispatch("init");
        });

        return {
            ...toRefs(state),
        };
    },
    computed: {},
});
</script>

<style rel="stylesheet" lang="scss">
@import url("https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap");

$blue: #263459;
$color1: #96351e;
$color2: #dbb98f;
$query: #c2e8b4;
$key: #f0b3c7;

html,
body {
    overflow-y: hidden;
    overflow-x: hidden;

    width: 100vw;

    font-family: "Roboto", sans-serif;
    font-size: 16px;
    background: #f5f5f7;

    color: #1d1d1f;
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

div#header-block {
    height: 10px;
    width: 100%;
    background-color: $blue;
    margin-bottom: 10px;
}

.deck-tooltip .query {
  color: $query;
}

.deck-tooltip .key {
  color: $key;
}

</style>
