import { Store } from '@/store';// path to store file

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $store: Store;
  }
}
declare module "*.vue" {
  import Vue from "vue";
  export default Vue;
}

declare module '*.csv' {
  const content: any;
  export default content;
}