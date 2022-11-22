<template>
  <div class="viewHead">
    Matrix View

    <p>rawdata</p>
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
            rawdata: computed(() => store.state.rawdata)
        });

        const drawMatrices = (rawdata: string) => {
            // todo: draw visualizations here
        }

        watch(() => state.rawdata,
        () => {
            // listen to rawdata. Functions below will be trigerred whenever rawdata updates
            drawMatrices(state.rawdata)
        })

        return {
            ...toRefs(state),
        };
    },
};
</script>

<style lang="scss">
</style>
