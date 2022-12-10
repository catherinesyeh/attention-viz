import { createApp } from "vue";
// import { createHead } from '@vueuse/head'

import App from "./components/App.vue";
import { store, key } from '@/store/index'

import {
    Radio, Input, Button, Select
} from "ant-design-vue";

createApp(App)
    .use(store, key)
    .use(Radio).use(Input).use(Button).use(Select)
    .mount("#app");
