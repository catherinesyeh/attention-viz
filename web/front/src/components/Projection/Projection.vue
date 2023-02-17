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

                    <p class="label">Search</p>
                    <a-input-search v-model:value="searchToken" placeholder="Search tokens" enter-button
                        @search="onSearch(searchToken)" spellcheck="false" />
                    <Transition>
                        <a-button class="clear" type="link" v-show="searchToken != ''"
                            @click="clearSearch">clear</a-button>
                    </Transition>

                    <p class="label">Labels</p>
                    <a-checkbox v-model:checked="showAll" @click="toggleCheckbox"
                        :class="{ disabled: mode == 'matrix' }">show</a-checkbox>

                    <p class="label">Attention Lines</p>
                    <a-checkbox v-model:checked="showAttention" @click="toggleCheckboxAttention"
                        :class="{ disabled: mode == 'matrix' || view != 'attn' }">show</a-checkbox>

                    <p class="label">Dot Size</p>
                    <a-checkbox v-model:checked="sizeByNorm" @click="toggleCheckboxNorm"
                        :class="{ disabled: mode == 'matrix' }">scale by norm</a-checkbox>

                    <!-- <p class="label">Mode</p>
                    <a-radio-group v-model:value="mode">
                        <a-radio-button value="single">single</a-radio-button>
                        <a-radio-button value="matrix">matrix</a-radio-button>
                    </a-radio-group> -->

                    <p class="label">Developer Tool</p>
                    <a-button type="primary" @click="logViewport">
                        log viewport
                    </a-button>

                    <div>
                        <p class="label">Mode</p>
                        <a-radio-group v-model:value="dimension">
                            <a-radio-button value="2D">2D</a-radio-button>
                            <a-radio-button value="3D">3D</a-radio-button>
                        </a-radio-group>
                    </div>

                    <Transition>
                        <div v-show="mode === 'single'">
                            <p class="label">Controls</p>
                            <div id="control-buttons">
                                <a-button class="center" type="default" size="small" :class="{ disabled: layer < 1 }"
                                    @click="moveToPlot('up')" :disabled="layer < 1">
                                    <template #icon>
                                        <ArrowUpOutlined />
                                    </template>
                                </a-button>
                                <div class="arrow-group center">
                                    <a-button type="default" size="small" :class="{ disabled: head < 1 }"
                                        @click="moveToPlot('left')" :disabled="head < 1">
                                        <template #icon>
                                            <ArrowLeftOutlined />
                                        </template>
                                    </a-button>
                                    <a-button type="default" size="small" :class="{ disabled: head > 10 }"
                                        @click="moveToPlot('right')" :disabled="head > 10">
                                        <template #icon>
                                            <ArrowRightOutlined />
                                        </template>
                                    </a-button>
                                </div>
                                <a-button class="center" type="default" size="small" :class="{ disabled: layer > 10 }"
                                    @click="moveToPlot('down')" :disabled="layer > 10">
                                    <template #icon>
                                        <ArrowDownOutlined />
                                    </template>
                                </a-button>
                            </div>
                        </div>
                    </Transition>
                </div>
            </div>
            <div class="gradient-edge">
            </div>
            <div class="gradient-edge right">
                <Legend />
            </div>
            <!-- <canvas id="matrix-canvas" /> -->

            <MatrixView v-show="!renderState" ref="matrixView" />
        </div>
    </div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch, ref, defineComponent } from "vue";
import { useStore } from "@/store/index";

import { Typing } from "@/utils/typing";
import MatrixView from "./MatrixView/MatrixView.vue";
import Legend from "./Legend/Legend.vue";
import { ArrowUpOutlined, ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons-vue";

export default defineComponent({
    components: { MatrixView, Legend, ArrowUpOutlined, ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined },
    setup() {
        const store = useStore();

        const matrixView = ref(null);

        const state = reactive({
            mode: computed(() => store.state.mode),
            renderState: computed(() => store.state.renderState),
            searchToken: "",
            view: computed(() => store.state.view),
            showAll: computed(() => store.state.showAll),
            sizeByNorm: computed(() => store.state.sizeByNorm),
            showAttention: computed(() => store.state.showAttention),
            // disableLabel: computed(() => store.state.disableLabel),
            colorBy: computed(() => store.state.colorBy),
            layer: computed(() => store.state.layer),
            head: computed(() => store.state.head),
            modelType: computed(() => store.state.modelType),
            dimension: computed({
                get: () => store.state.dimension,
                set: (v) => store.commit("setDimension", v)
            }),
        });

        const onClickReset = () => {
            (matrixView.value as any).resetZoom();
        }

        const resetToMatrix = () => {
            (matrixView.value as any).reset(true);
        }

        const clearSearch = () => {
            state.searchToken = "";
            onSearch(state.searchToken);
        }

        const onSearch = (str: string) => {
            store.commit("setView", "search");
            let num_results = (matrixView.value as any).onSearch(str);
            // console.log(num_results);
            if (str != "") { // display # search results
                state.searchToken = str + " (" + num_results + " results)";
            }
        }

        const logViewport = () => {
            setTimeout(() => {
                (matrixView.value as any).printViewport();
            }, 100)
        }

        const toggleCheckbox = () => {
            store.commit('setShowAll', !state.showAll);
        }

        const toggleCheckboxAttention = () => {
            store.commit('setShowAttention', !state.showAttention);
        }

        const toggleCheckboxNorm = () => {
            store.commit('setSizeByNorm', !state.sizeByNorm);
        }

        // zoom to single plot
        const zoomToPlot = (layer: number, head: number) => {
            (matrixView.value as any).zoomToPlot(layer, head, true);
        }

        // move 1 plot up/left/right/down
        const moveToPlot = (direction: string) => {
            switch (direction) {
                case "up":
                    zoomToPlot((state.layer as number) - 1, (state.head as number));
                    break;
                case "left":
                    zoomToPlot((state.layer as number), (state.head as number) - 1);
                    break;
                case "right":
                    zoomToPlot((state.layer as number), (state.head as number) + 1);
                    break;
                case "down":
                    zoomToPlot((state.layer as number) + 1, (state.head as number));
                    break;
                default:
                    throw Error("Invalid direction!");
            }
        }

        watch(() => state.view,
            () => {
                if (state.view == "attn") {
                    state.searchToken = "";
                }
            })

        watch(() => state.modelType,
            () => { // clear highlighted tokens for simplicity
                store.commit("setHighlightedTokenIndices", []);
                if (state.searchToken.length > 0) {
                    state.searchToken = "";
                }
            })

        return {
            ...toRefs(state),
            matrixView,
            onClickReset,
            resetToMatrix,
            clearSearch,
            onSearch,
            logViewport,
            zoomToPlot,
            moveToPlot,
            toggleCheckbox,
            toggleCheckboxNorm,
            toggleCheckboxAttention
        };
    }
});
</script>

<style lang="scss">
// $background: #f5f5f7;

#label-wrapper {
    position: absolute;
    top: 15px;
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

p.label {
    margin-top: 15px;
    margin-bottom: 0;
    font-size: smaller;
}

#control-buttons {
    width: fit-content;
}

#control-buttons .center {
    display: block;
    margin: auto;
}

.arrow-group button:first-child {
    margin-right: 25px;
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
    background: linear-gradient(to right, var(--background), rgba(255, 255, 255, 0));
}

.gradient-edge.right {
    left: unset;
    right: 0;
    background: linear-gradient(to left, var(--background), rgba(255, 255, 255, 0));
}

div.matrix-cell {
    position: absolute;
    border: 1px solid #1d1d1f;
}

// search
.clear {
    display: block;
    position: absolute;
    right: 0;
    padding: 0;
    font-size: small;
    color: #888 !important;
}
</style>
