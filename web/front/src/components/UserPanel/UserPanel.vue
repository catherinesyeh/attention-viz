<template>
  <div class="viewHead">
    User Config Panel
  </div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch } from "vue";
import * as _ from "underscore";
import { useStore } from "@/store/index";

export default {
    components: {  },
    setup() {
        const store = useStore();

        const state = reactive({

        });

        return {
            ...toRefs(state),
        };
    },
};
</script>

<style lang="scss">
.viewHead {
  margin-left: 10px;
  margin-top: 10px;
}
</style>
