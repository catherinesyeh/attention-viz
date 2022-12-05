import { createApp } from "vue";
// import { createHead } from '@vueuse/head'

import App from "./components/App.vue";
import { store, key } from '@/store/index'

import {
    Radio
} from "ant-design-vue";

createApp(App)
    .use(store, key)
    .use(Radio)
    .mount("#app");
