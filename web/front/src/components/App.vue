<template>
  <nav class="navbar navbar-light bg-light">
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1">Pulse of HKUST Dashboard</span>
    </div>
  </nav>
  <div class="main">
    <div class="row">
      <div class="col-3">
        <UserPanel />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import "bootstrap/dist/css/bootstrap.css";

import { defineComponent } from "vue";
import { useStore } from "@/store/index";

import UserPanel from "./UserPanel/UserPanel.vue";

import { onMounted, computed, reactive, toRefs, h, watch } from "vue";

export default defineComponent({
    name: "App",
    components: { UserPanel },
    setup() {
        const store = useStore();

        const state = reactive({});

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

div#header-block {
    height: 10px;
    width: 100%;
    background-color: $blue;
    margin-bottom: 10px;
}
// div#header-block-2 {
//     height: 5px;
//       margin-bottom: 10px;
//     background-color: $blue;
// }

@media all and (min-width: 768px) {
    // margin: 0px 100px;
    div.myrow {
        margin-left: 30px;
        margin-right: 30px;
        margin-top: 30px;
        margin-bottom: 30px;
    }

    div.col-sm-only {
        display: none;
    }

    div.section {
        padding-right: 10px;
        padding-left: 10px;
        padding-bottom: 10px;
        padding-top: 10px;
    }
}

div.main {
    margin: 0px 10px;
    height: calc(100vh - 40px);
    max-height: calc(100vh - 40px);
}

@media all and (max-width: 768px) {
    div.myrow {
        margin: 20px 10px;
    }

    div.col-sm-none {
        display: none;
    }

    div.section {
        padding: 10px 20px;
    }
}

div#body {
    width: 100vw;
    overflow: hidden;
}

.heading-text {
    font-weight: 500;
    font-size: 20px;
}

.section-head {
    font-weight: 500;
    font-size: 1.6em;
    padding-bottom: 4px;
    &.section-head-padding {
        padding-top: 30px;
        padding-bottom: 10px;
    }

    & > span {
        // background: url("~@/assets/background.png");
    }
}

//    .section-head > span {
//         // background-color: none;
//         position: relative;
//         z-index: 0;
//     }

//     .section-head > span::after {
//         background-color: $color2;
//         content: "";
//         height: 30%;
//         position: absolute;
//         left: 0;
//         margin-left: -0.2rem;
//         top: 65%;
//         width: calc(100% + 0.5rem);
//         z-index: -1;
//     }

div#row-profile {
    // padding-top: 40px;
    padding-bottom: 20px;
    border-bottom: #aaa 1px solid;
}

.highlight-text {
    border-bottom: 3px solid $color1;
    text-decoration: none !important;
}

span.url {
    color: $color1;
    // border-bottom: 2px solid $color2;
}

a.url {
    // display: inline-block;
    color: $color1;
    // font-weight: 900;
    text-decoration: none;
    // border-bottom: 2px solid $color2;
    // position: relative;

    // &::after {
    //     content: "";
    //     display: block;
    //     width: 0;
    //     height: 3px;
    //     background: $color1;
    //     transition: width 0.3s;
    //     position: absolute;
    // }

    &:hover {
        text-decoration: underline;
        text-decoration-color: $color1;
        text-decoration-thickness: 2px;
        // border-bottom: 2px solid $color2;
        // text-decoration: none;
        color: $color2;
        // transition: color 0.5s;
    }

    // &:hover::after {
    //     width: 100%;
    // }
}

.date-text {
    font-size: 14px;
    color: #aaa;
}

.misc-item {
    font-size: 16px;
}

.footer {
    margin-top: 20px;
    background-color: $blue;
    height: 40px;
    color: white;
}
</style>
