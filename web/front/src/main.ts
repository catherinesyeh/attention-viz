import { createApp } from "vue";
// import { createHead } from '@vueuse/head'

import App from "./components/App.vue";
import { store, key } from '@/store/index'

import {
    Checkbox, Card, Tag, Tree, Table, Select, Button, Form, InputNumber
} from "ant-design-vue";

createApp(App)
    .use(store, key)
    .use(Checkbox).use(Card).use(Tag).use(Tree).use(Table).use(Select).use(Button).use(Form).use(InputNumber)
    .mount("#app");
