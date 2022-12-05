<!-- Vue components: https://vuejs.org/guide/essentials/component-basics.html -->
<template>
    <div class="viewHead">
        Matrix View
        <div id="matrix-wrapper">
            <ScatterPlot
                v-for="d in matrixData"
                :key="d.head + '-' + d.layer"
                class="matrix-cell"
                :style="{
                    top: d.head * (matrixCellWidth + matrixCellMargin) + 'px',
                    left: d.layer * (matrixCellHeight + matrixCellMargin) + 'px',
                    width: matrixCellWidth + 'px',
                    height: matrixCellHeight + 'px',
                }"
                :data="d"
            />
        </div>
    </div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch } from "vue";
import * as _ from "underscore";
import { useStore } from "@/store/index";
import ScatterPlot from "./ScatterPlot.vue";

export default {
    components: { ScatterPlot },
    setup() {
        const store = useStore();

        const state = reactive({
            matrixData: computed(() => store.state.matrixData),
            matrixCellHeight: 80,
            matrixCellWidth: 80,
            matrixCellMargin: 5,
        });

        const drawMatrices = (matrixData: any) => {
            // todo: draw visualizations here
        };

        const computeLayout = () => {
            let NHead = 12,
                NLayer = 12;
            let wrapperWidth = document.querySelector("#matrix-wrapper")?.clientWidth || 0;

            state.matrixCellWidth = (wrapperWidth - (NHead * state.matrixCellMargin - 1)) / NHead;
            state.matrixCellHeight = state.matrixCellWidth; // make cells square

            console.log(wrapperWidth, state.matrixCellWidth);
        };

        watch(
            () => state.matrixData,
            () => {
                // compute cell size
                computeLayout();

                // listen to matrixData. Functions below will be trigerred whenever matrixData updates
                drawMatrices(state.matrixData);
            }
        );

        return {
            ...toRefs(state),
        };
    },
};
</script>

<style lang="scss" scoped>
div#matrix-wrapper {
    position: relative;
}

div.matrix-cell {
    position: absolute;
    border: 1px solid #1d1d1f;
}
</style>
