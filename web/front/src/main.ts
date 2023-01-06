import { createApp } from "vue";
// import { createHead } from '@vueuse/head'

import App from "./components/App.vue";
import { store, key } from '@/store/index'

import {
    Radio, Input, Button, Select, Checkbox
} from "ant-design-vue";

/* import the fontawesome core */
import { library } from '@fortawesome/fontawesome-svg-core'

/* import font awesome icon component */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

/* import specific icons */
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons'

/* add icons to the library */
library.add(faMoon, faSun)


createApp(App)
    .use(store, key)
    .use(Radio).use(Input).use(Button).use(Select).use(Checkbox)
    .component('font-awesome-icon', FontAwesomeIcon)
    .mount("#app");
