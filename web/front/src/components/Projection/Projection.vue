<!-- Vue components: https://vuejs.org/guide/essentials/component-basics.html -->
<template>
    <div>
        <!-- Matrix View -->
        <div id="matrix-wrapper">
            <div id="top-right-box" v-show="!renderState">
                <p id="num-msg" class="subtitle">Based on {{ num_message }}</p>
            </div>
            <div id="bottom-left-box" v-show="!renderState">
                <a-button type="primary" id="about" @click="showModal">about this tool</a-button>
                <a-modal v-model:visible="modalVisible" title="About Attention Viz" @ok="closeModal">
                    <p><b>Attention Viz</b> is an interactive tool that visualizes global attention patterns for transformer
                        models. To create this tool, we visualize the joint embeddings of <b class="green">query</b>
                        and <b class="pink">key</b> vectors. Click a
                        button below to learn more.</p>
                    <a-button type="primary" id="docs-link" href="https://catherinesyeh.github.io/attn-docs/"
                        target="_blank">Documentation</a-button>
                    <a-button type="primary" id="paper-link" class="disabled">arXiv Preprint: Coming Soon!</a-button>
                </a-modal>
            </div>
            <Transition>
                <a-button type="default" id="clear-attn" v-show="!renderState && view == 'attn'" @click="clearSelection">
                    clear selection
                </a-button>
            </Transition>
            <div id="label-wrapper">
                <span id="loading" v-show="renderState">Loading...</span>
                <div id="matrix-labels" v-show="!renderState">
                    <p class="axis-label">
                        <span class="head-axis">head →</span>
                        <span class="layer-axis">layer ↓</span>
                    </p>

                    <p class="label"><a-tooltip placement="leftTop" color="var(--radio-hover)">
                            <template #title>
                                <span>search for <span v-if="!modelType.includes('vit')">a token</span><span v-else>an
                                        object</span></span>
                            </template>
                            <font-awesome-icon icon="circle-info" class="info-icon first" />
                        </a-tooltip>Search</p>
                    <a-input-search v-model:value="searchToken" :placeholder="placeholder" enter-button
                        @search="onSearch(searchToken)" spellcheck="false" />
                    <Transition>
                        <a-button class="clear" type="link" v-show="searchToken != ''" @click="clearSearch">clear</a-button>
                    </Transition>

                    <p class="label"><a-tooltip placement="leftTop" color="var(--radio-hover)"
                            :class="{ disabled: mode === 'matrix' }">
                            <template #title>
                                <span>overlay options:</span>
                                <ul>
                                    <li><i>labels</i>: <span v-if="!modelType.includes('vit')">token label (e.g., cat,
                                            april)</span>
                                        <span v-else>object label (e.g., bg, person)</span>
                                    </li>
                                    <li><i>attention lines</i>: top 2 connections for each token; line opacity
                                        denotes attention weight</li>
                                </ul>
                            </template>
                            <font-awesome-icon icon="circle-info" class="info-icon first" />
                        </a-tooltip>Show</p>
                    <a-checkbox v-model:checked="showAll" @click="toggleCheckbox"
                        :class="{ disabled: mode == 'matrix' || view == 'attn' }">labels</a-checkbox>
                    <a-checkbox v-model:checked="showAttention" @click="toggleCheckboxAttention"
                        :class="{ disabled: mode == 'matrix' || view != 'attn' }">attention lines</a-checkbox>

                    <p class="label"><a-tooltip placement="leftTop" color="var(--radio-hover)"
                            :class="{ disabled: mode === 'matrix' || modelType == 'vit-16' || modelType == 'vit-32' }">
                            <template #title>
                                <span>scale dots in scatterplot by token embedding norm</span>
                            </template>
                            <font-awesome-icon icon="circle-info" class="info-icon first" />
                        </a-tooltip>Dot Size</p>
                    <a-checkbox v-model:checked="sizeByNorm" @click="toggleCheckboxNorm" :class="{
                        disabled: mode == 'matrix' || modelType == 'vit-16' || modelType == 'vit-32'
                    }">scale by
                        norm</a-checkbox>

                <!-- <p class="label">Developer Tool</p>
                    <a-button type="primary" @click="logViewport">
                        log viewport
                                                                                                                                                                                                                                                                                </a-button> -->

                    <div>
                        <p class="label"><a-tooltip placement="leftTop" color="var(--radio-hover)">
                                <template #title>
                                    <span>view plots in 2D or 3D</span>
                                </template>
                                <font-awesome-icon icon="circle-info" class="info-icon first" />
                            </a-tooltip>Mode</p>
                        <a-radio-group v-model:value="dimension">
                            <a-radio-button value="2D">2D</a-radio-button>
                            <a-radio-button value="3D">3D</a-radio-button>
                        </a-radio-group>
                        <Transition>
                            <p class="label italic" v-show="dimension === '3D' && mode === 'matrix'">click a head to see
                                full
                                3D</p>
                        </Transition>
                    </div>

                    <Transition>
                        <div v-show="mode === 'single'">
                            <p class="label"><a-tooltip placement="leftTop" color="var(--radio-hover)">
                                    <template #title>
                                        <span>explore an adjacent attention head</span>
                                        <ul>
                                            <li><i>up</i>: move up 1 layer</li>
                                            <li><i>left</i>: move left 1 head</li>
                                            <li><i>right</i>: move right 1 head</li>
                                            <li><i>down</i>: move down 1 layer</li>
                                        </ul>
                                    </template>
                                    <font-awesome-icon icon="circle-info" class="info-icon first" />
                                </a-tooltip>Move</p>
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
            attnLoading: computed(() => store.state.attentionLoading),
            // disableLabel: computed(() => store.state.disableLabel),
            colorBy: computed(() => store.state.colorBy),
            layer: computed(() => store.state.layer),
            head: computed(() => store.state.head),
            modelType: computed(() => store.state.modelType),
            dimension: computed({
                get: () => store.state.dimension,
                set: (v) => store.commit("setDimension", v)
            }),
            placeholder: "",
            num_message: "",
            modalVisible: true
        });

        onMounted(() => {
            switchPlaceholder();
        })

        const onClickReset = () => {
            (matrixView.value as any).resetZoom();
        }

        const resetToMatrix = () => {
            (matrixView.value as any).reset(true);
        }

        const clearSearch = () => {
            const oldSearch = state.searchToken;
            state.searchToken = "";
            if (!oldSearch.includes("(0 ") && oldSearch.includes("results)")) {
                // actually need to clear search results from scatterplot
                store.commit("setHighlightedTokenIndices", []);
                // onSearch(state.searchToken);
            } // else we just need to reset input box
        }

        const onSearch = (str: string) => {
            if (str == "") { // don't search empty string
                return;
            }
            if (state.view != "search") {
                store.commit("setView", "search");
            }
            let num_results = (matrixView.value as any).onSearch(str);
            // console.log(num_results);
            // if (str != "") { // display # search results
            state.searchToken = str + " (" + num_results + " results)";
            // }
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
            (matrixView.value as any).zoomToPlot(layer, head, true, false);
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

        // switch placeholder text
        const switchPlaceholder = () => {
            if (state.modelType == 'vit-32' || state.modelType == 'vit-16') {
                state.placeholder = "e.g., person, bg";
                state.num_message = state.modelType == 'vit-32' ? "8 images" : "6 images";
            } else {
                state.placeholder = "e.g., cat, april";
                state.num_message = state.modelType == "bert" ? "84 sentences" : "87 sentences";
            }
        }

        // clear attention
        const clearSelection = () => {
            store.commit("setShowAttn", false);
        }

        // show modal
        const showModal = () => {
            state.modalVisible = true;
        }

        const closeModal = () => {
            state.modalVisible = false;
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
                if (state.attnLoading) {
                    store.commit("updateAttentionLoading", false);
                }

                switchPlaceholder();
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
            toggleCheckboxAttention,
            switchPlaceholder,
            clearSelection,
            showModal,
            closeModal
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
    transition: 0.5s;
}

p.label.italic {
    font-style: italic;
    opacity: 0.7;
    margin-top: 5px;
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

// img/sentence info
#top-right-box,
#bottom-left-box {
    position: absolute;
    top: 15px;
    right: 10px;
    margin-bottom: 0;
    z-index: 10;
}

#bottom-left-box {
    position: absolute;
    bottom: 70px;
    left: 10px;
    z-index: 10;
    top: unset;
    right: unset;
}

// clear attn bttn
#clear-attn {
    position: absolute;
    left: 50%;
    top: 20px;
    transform: translate(-50%);
    z-index: 10;
}
</style>
