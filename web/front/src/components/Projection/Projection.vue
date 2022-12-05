<!-- Vue components: https://vuejs.org/guide/essentials/component-basics.html -->
<template>
    <div>
        <!-- Matrix View -->
        <div id="matrix-wrapper">
            <div id="label-wrapper">
                <span id="loading" v-show="renderState">Loading...</span>
                <div id="matrix-labels" v-show="!renderState">
                    <p class="axis-label">
                        <span class="head-axis">head →</span>
                        <span class="layer-axis">layer ↓</span>
                    </p>
                    <button id="matrix-reset" type="button" class="btn btn-dark btn-sm reset" @click="onClickReset">
                        reset
                    </button>

                    <br />

                    Mode <br />
                    <a-radio-group v-model:value="mode">
                        <a-radio-button value="single">Single</a-radio-button>
                        <a-radio-button value="matrix">Matrix</a-radio-button>
                    </a-radio-group>
                </div>
            </div>
            <div class="gradient-edge"></div>
            <div class="gradient-edge right"></div>
            <!-- <canvas id="matrix-canvas" /> -->

            <MatrixView v-show="mode == 'matrix'" ref="matrixView" />
        </div>
    </div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch, ref, defineComponent } from "vue";
import { useStore } from "@/store/index";

import { Typing } from "@/utils/typing";
import MatrixView from "./MatrixView/MatrixView.vue";

export default defineComponent({
    components: { MatrixView },
    setup() {
        const store = useStore();

        const matrixView = ref(null);

        const state = reactive({
            mode: "matrix",
            renderState: computed(() => store.state.renderState)
        });

        const onClickReset = () => {
            if (state.mode === 'matrix') {
                (matrixView.value as any).reset();
            }
        }

        return {
            ...toRefs(state),
            matrixView,
            onClickReset
        };
    },
});
</script>

<style lang="scss" scoped>
$background: #f5f5f7;

#label-wrapper {
    position: absolute;
    left: 10px;
    z-index: 9999;
}

#matrix-labels {
    transition: 0.5s;
}
.axis-label {
    transition: 0.5s;
}
.axis-label span {
    display: block;
    font-size: smaller;
    transition: 0.5s;
}

div#matrix-wrapper {
    position: relative;
    height: 100vh;
    width: 100%;

    canvas {
        height: 100%;
        width: 100%;
    }
}

.gradient-edge {
    position: absolute;
    top: 0;
    z-index: 1;
    left: 0;
    height: 100vh;
    width: calc(100px + 8vw);
    background: linear-gradient(to right, #f5f5f7, rgba(255, 255, 255, 0));
}

.gradient-edge.right {
    left: unset;
    right: 0;
    background: linear-gradient(to left, #f5f5f7, rgba(255, 255, 255, 0));
}

div.matrix-cell {
    position: absolute;
    border: 1px solid #1d1d1f;
}
</style>
