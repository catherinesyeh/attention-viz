<!-- Vue components: https://vuejs.org/guide/essentials/component-basics.html -->
<template>
    <div>
        <Transition>
            <a-button type="default" id="clear-attn" v-show="!renderState && (view == 'attn' || view == 'search')"
                @click="clearSelection">
                clear selection
            </a-button>
        </Transition>
        <Transition>
            <div id="loading" v-show="renderState">
                <p>Loading...</p>
                <p>This visualization requires many megabytes and may take up to a minute to render.</p>
            </div>
        </Transition>
        <div class="row">
            <div id="label-wrapper" class="col-2">
                <Transition>
                    <Circle v-show="attnLoading || transitionInProgress" />
                </Transition>
                <!-- left sidebar -->
                <div id="matrix-labels">
                    <div class="align-top label-grid">
                        <div>
                            <p v-if='mode === "single"'>Single View<a-tooltip placement="rightTop">
                                    <template #title>
                                        <span>q-k attention patterns for a single head</span>
                                    </template>
                                    <font-awesome-icon icon="info" class="info-icon" />
                                </a-tooltip>

                                <Transition>
                                    <span>({{ "Layer " + curLayer + " Head " + curHead }})</span>
                                </Transition>
                            </p>
                            <p v-else>Matrix View<a-tooltip placement="rightTop">
                                    <template #title>
                                        <span>q-k attention patterns for all attention heads</span>
                                    </template>
                                    <font-awesome-icon icon="info" class="info-icon" />
                                </a-tooltip></p>

                            <p id="attn-msg" class="subtitle">{{ attnMsg }}</p>
                        </div>

                        <Transition>
                            <p class="axis-label" v-show="mode !== 'single'" :class="{ hide: mode === 'single' }">
                                <span class="head-axis">head →</span>
                                <span class="layer-axis">layer ↓</span>
                            </p>
                        </Transition>
                    </div>

                    <div class="label-grid">
                        <div>
                            <p class="label">Model<a-tooltip placement="right">
                                    <template #title>
                                        <span>transformer options:</span>
                                        <ul>
                                            <li v-for="option in modelOptions">
                                                <i>{{ option.value }}</i> (<span
                                                    v-if="option.value.includes('vit')">vision</span>
                                                <span v-else>language</span>)
                                            </li>
                                        </ul>
                                    </template>
                                    <font-awesome-icon icon="info" class="info-icon" />
                                </a-tooltip></p>
                            <a-select v-model:value="modelType" style="width: 115px" :options="modelOptions">
                            </a-select>
                        </div>
                        <div>
                            <p class="label">Projection<a-tooltip placement="right">
                                    <template #title>
                                        <span>projection methods for creating joint q-k embeddings</span>
                                    </template>
                                    <font-awesome-icon icon="info" class="info-icon" />
                                </a-tooltip></p>
                            <a-select v-model:value="projectionMethod" style="width: 115px" :options="projectionMethods">
                            </a-select>
                        </div>
                    </div>

                    <p class="label">Search<a-tooltip placement="rightBottom">
                            <template #title>
                                <span>search for <span v-if="!modelType.includes('vit')">a token</span><span v-else>an
                                        object</span></span>
                            </template>
                            <font-awesome-icon icon="info" class="info-icon" />
                        </a-tooltip></p>
                    <a-input-search v-model:value="searchToken" :placeholder="placeholder" enter-button
                        @search="onSearch(searchToken)" spellcheck="false" />
                    <Transition>
                        <a-button class="clear" type="link" v-show="searchToken != ''" @click="clearSearch">clear</a-button>
                    </Transition>

                    <p class="label">Show<a-tooltip placement="rightTop" :class="{ disabled: mode === 'matrix' }">
                            <template #title>
                                <span>overlay options:</span>
                                <ul>
                                    <li><i>labels</i>: <span v-if="!modelType.includes('vit')">token label (e.g., cat,
                                            april)</span>
                                        <span v-else>object label (e.g., background, person)</span>
                                    </li>
                                    <li><i>attention lines</i>: top 2 connections for each token; line opacity
                                        denotes attention weight</li>
                                </ul>
                            </template>
                            <font-awesome-icon icon="info" class="info-icon" />
                        </a-tooltip></p>
                    <div style="width:235px">
                        <a-checkbox v-model:checked="showAll" :class="{ disabled: mode == 'matrix' }">labels</a-checkbox>
                        <a-checkbox v-model:checked="showAttention"
                            :class="{ disabled: mode == 'matrix' || view != 'attn' }">attention lines</a-checkbox>
                    </div>

                    <p class="label">Dot Size<a-tooltip placement="rightBottom"
                            :class="{ disabled: mode === 'matrix' || modelType == 'vit-16' || modelType == 'vit-32' }">
                            <template #title>
                                <span>scale dots in scatterplot by token embedding norm</span>
                            </template>
                            <font-awesome-icon icon="info" class="info-icon" />
                        </a-tooltip></p>
                    <a-checkbox v-model:checked="sizeByNorm" :class="{
                            disabled: mode == 'matrix' || modelType == 'vit-16' || modelType == 'vit-32'
                        }">scale by
                        norm</a-checkbox>

                    <!-- <p class="label">Developer Tool</p>
                    <a-button type="primary" @click="logViewport">
                        log viewport
                    </a-button> -->

                    <div class="label-grid">
                        <div>
                            <p class="label">Color<a-tooltip placement="rightTop">
                                    <template #title>
                                        <span>color encodings:</span>
                                        <ul>
                                            <li v-for="(item, key) in colorByDict">
                                                <i>{{ item.label }}</i>: {{ item.desc }}
                                            </li>
                                        </ul>
                                    </template>
                                    <font-awesome-icon icon="info" class="info-icon" />
                                </a-tooltip></p>
                            <a-select v-model:value="colorBy" style="width: 135px" :options="colorByOptions">
                            </a-select>
                        </div>

                        <div>
                            <p class="label">Mode<a-tooltip placement="rightBottom">
                                    <template #title>
                                        <span>view plots in 2D or 3D</span>
                                    </template>
                                    <font-awesome-icon icon="info" class="info-icon" />
                                </a-tooltip></p>
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
                    </div>

                    <Legend ref="legend" />

                    <Transition>
                        <div v-show="!renderState">
                            <p id="num-msg" class="subtitle"><b>data info:</b> based on {{ num_message }}<span
                                    v-show="modelType.includes('vit')"><a-tooltip placement="rightTop">
                                        <template #title>
                                            <span>object labels are generated from a segmentation model and may not be 100%
                                                accurate</span>
                                        </template>
                                        <font-awesome-icon icon="info" class="info-icon" />
                                    </a-tooltip></span></p>
                            <Transition>
                                <DataGrid ref="dataGrid" v-show="modelType.includes('vit') && mode === 'single'" />
                            </Transition>
                        </div>
                    </Transition>

                    <Transition>
                        <div v-show="!renderState && mode === 'single'">
                            <p class="label">View Adjacent Head<a-tooltip placement="rightTop">
                                    <template #title>
                                        <span>explore an adjacent attention head</span>
                                        <ul>
                                            <li><i>up</i>: move up 1 layer</li>
                                            <li><i>left</i>: move left 1 head</li>
                                            <li><i>right</i>: move right 1 head</li>
                                            <li><i>down</i>: move down 1 layer</li>
                                        </ul>
                                    </template>
                                    <font-awesome-icon icon="info" class="info-icon" />
                                </a-tooltip></p>
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
            <div id="matrix-wrapper" class="col-10">
                <div class="gradient-edge">
                </div>
                <div class="gradient-edge right">
                </div>
            </div>
        </div>
        <MatrixView v-show="!renderState" ref="matrixView" />
    </div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch, ref, defineComponent } from "vue";
import { useStore } from "@/store/index";

import MatrixView from "./MatrixView/MatrixView.vue";
import Legend from "./Legend/Legend.vue";
import DataGrid from "./DataGrid/DataGrid.vue";
import Circle from './MatrixView/Circle.vue';
import { ArrowUpOutlined, ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons-vue";

const text_color_info = [
    {
        label: "query vs. key",
        value: "query_key",
        desc: "token type, query or key"
    },
    {
        label: "position",
        value: "position",
        desc: "token position in sentence (normalized), darker = later in the sentence"
    },
    {
        label: "position mod 5",
        value: "pos_mod_5",
        desc: "token position in sentence modulo 5 (unnormalized)"
    },
    {
        label: "punctuation",
        value: "punctuation",
        desc: "punctuation vs. non-punctuation tokens"
    },
    {
        label: "embedding norm",
        value: "embed_norm",
        desc: "token embedding norm, darker = higher norm"
    },
    {
        label: "token length",
        value: "token_length",
        desc: "number of chars in token, darker = longer token"
    },
    {
        label: "sentence length",
        value: "sent_length",
        desc: "number of tokens in sentence, darker = longer sentence"
    },
    {
        label: "token frequency",
        value: "token_freq",
        desc: "frequency of token in dataset, darker = more frequent"
    }
];

const image_color_info = [
    {
        label: "query vs. key",
        value: "query_key",
        desc: "token type, query or key (outline)"
    },
    {
        label: "query vs. key (fill)",
        value: "qk_map",
        desc: "token type, query or key (fill)"
    },
    {
        label: "patch row",
        value: "row",
        desc: "row of patch in image, darker = later row"
    },
    {
        label: "patch column",
        value: "column",
        desc: "column of patch in image, darker = later column"
    },
    {
        label: "no outline",
        value: "no_outline",
        desc: "original image patch without q/k outline"
    }
];

export default defineComponent({
    components: { MatrixView, Legend, DataGrid, Circle, ArrowUpOutlined, ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined },
    setup() {
        const store = useStore();

        const matrixView = ref(null);
        const legend = ref(null);
        const dataGrid = ref(null);

        const state = reactive({
            mode: computed(() => store.state.mode),
            renderState: computed(() => store.state.renderState),
            searchToken: "",
            view: computed(() => store.state.view),
            showAll: computed({
                get: () => store.state.showAll,
                set: (v) => store.commit("setShowAll", v)
            }),
            sizeByNorm: computed({
                get: () => store.state.sizeByNorm,
                set: (v) => store.commit("setSizeByNorm", v)
            }),
            showAttention: computed({
                get: () => store.state.showAttention,
                set: (v) => store.commit("setShowAttention", v)
            }),

            attnLoading: computed(() => store.state.attentionLoading),
            layer: computed(() => store.state.layer),
            head: computed(() => store.state.head),

            dimension: computed({
                get: () => store.state.dimension,
                set: (v) => store.commit("setDimension", v)
            }),

            placeholder: "",
            num_message: "",

            colorBy: computed({
                get: () => store.state.colorBy,
                set: (v) => store.commit("setColorBy", v),
            }),
            colorByOptions: [] as any,
            colorByDict: {} as any,

            projectionMethod: computed({
                get: () => store.state.projectionMethod,
                set: (v) => store.commit("setProjectionMethod", v),
            }),
            projectionMethods: ["tsne", "umap", "pca"].map((x) => ({ value: x, label: x })),

            modelType: computed({
                get: () => store.state.modelType,
                set: (v) => store.dispatch("switchModel", v)
            }),
            // modelOptions: ["vit-16", "vit-32", "bert", "gpt-2"].map((x) => (
            modelOptions: ["vit-32", "bert", "gpt-2"].map((x) => (
                { value: x, label: x }
            )),

            tokenData: computed(() => store.state.tokenData),
            attnMsg: "click a plot to zoom in",
            curLayer: computed(() => store.state.layer),
            curHead: computed(() => store.state.head),
            showAttn: computed(() => store.state.showAttn),
            transitionInProgress: computed(() => store.state.transitionInProgress),
            clearSelection: computed(() => store.state.clearSelection),
        });

        onMounted(() => {
            switchViewMsg();
            switchPlaceholder();
            switchColorOptions();
        })

        const onClickReset = () => {
            (matrixView.value as any).resetZoom();
        }

        const resetToMatrix = () => {
            (matrixView.value as any).reset(true);
        }

        const clearSearch = () => {
            store.commit("updateTransitionInProgress", true);
            state.searchToken = "";
            // actually need to clear search results from scatterplot
            store.commit("setHighlightedTokenIndices", []);
            store.commit("setView", "none");
            store.commit("updateTransitionInProgress", false);
        }

        const onSearch = (str: string) => {
            if (str == "") { // don't search empty string
                return;
            }
            if (state.view != "search") {
                store.commit("setView", "search");
            }
            let num_results = (matrixView.value as any).onSearch(str);
            state.searchToken = str + " (" + num_results + " results)";
        }

        const logViewport = () => {
            setTimeout(() => {
                (matrixView.value as any).printViewport();
            }, 100)
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
                state.placeholder = "e.g., person, background";
            } else {
                state.placeholder = "e.g., cat, april";
            }
        }

        // switch data text
        const switchDataMsg = () => {
            const numTokens = state.tokenData.length;
            const numInstances = (matrixView.value as any).getUnique().length;
            const messageStart = numTokens + " tokens (";

            if (state.modelType.includes("vit")) {
                state.num_message = messageStart + numInstances + " images)";
            } else {
                state.num_message = messageStart + numInstances + " sentences)";
            }
        }

        // clear search/attention
        const clearSelection = () => {
            console.log('clearing selection');
            if (state.view == 'attn') {
                store.commit("updateTransitionInProgress", true);
                store.commit("setShowAttn", false);
                store.commit("updateTransitionInProgress", false);
            } else { // state.view == 'search'
                clearSearch();
            }
        }


        // show image data
        const showImages = () => {
            if (state.modelType.includes('vit')) {
                const images = (matrixView.value as any).getUnique();
                (dataGrid.value as any).drawGrid(images);
            }
        }

        const switchColorOptions = () => {
            // reset color options depending on model selected
            const curColorBy = state.colorBy;
            let color_map = state.modelType.includes("vit") ? image_color_info : text_color_info;

            state.colorByOptions = color_map.map((x) => ({ value: x.value, label: x.label }));
            state.colorByDict = Object.assign({}, ...color_map.map((x) => ({ [x.value]: { label: x.label, desc: x.desc } })));

            if (!(curColorBy in state.colorByDict)) {
                if (state.modelType.includes('vit')) {
                    store.commit("setColorBy", "no_outline"); // make no outline the default for vit
                } else {
                    store.commit("setColorBy", "query_key"); // query vs. key default for bert/gpt
                }
            }
        }

        // switch color msg
        const getColorMsg = () => {
            const colorMsg = state.colorByDict[state.colorBy].desc;
            (legend.value as any).setColorMsg(colorMsg);
        }

        const switchViewMsg = () => {
            state.attnMsg = state.mode == "single"
                ? "click a point to explore its attention"
                : "click a plot to zoom in";
        }

        watch(() => state.view,
            () => {
                if (state.view == "attn") {
                    state.searchToken = "";
                }
            })

        watch(
            () => [state.mode],
            () => {
                switchViewMsg();
            }
        )

        watch(() => state.modelType,
            () => { // clear highlighted tokens for simplicity
                store.commit("setHighlightedTokenIndices", []);
                if (state.searchToken.length > 0) {
                    state.searchToken = "";
                    store.commit("setView", "none");
                }
                if (state.attnLoading) {
                    store.commit("updateAttentionLoading", false);
                }

                switchPlaceholder();
                switchColorOptions();
                onClickReset();
            })

        watch(() => state.renderState, () => {
            if (!state.renderState) {
                showImages();
                switchDataMsg();
                getColorMsg();
            }
        })

        // change color msg
        watch([() => state.colorBy],
            () => {
                getColorMsg();
            })

        // clear search from matrix view if user unselects
        watch([() => state.clearSelection],
            () => {
                if (state.clearSelection) {
                    clearSelection();
                    store.commit("setClearSelection", false);
                }
            })

        return {
            ...toRefs(state),
            legend,
            dataGrid,
            matrixView,
            onClickReset,
            resetToMatrix,
            clearSearch,
            onSearch,
            logViewport,
            zoomToPlot,
            moveToPlot,
            switchPlaceholder,
            clearSelection,
            getColorMsg
        };
    }
});
</script>

<style lang="scss">
#label-wrapper {
    position: relative;
    padding-right: 0;
    z-index: 10;
    background-color: var(--background);
    overflow-x: visible;
}

#matrix-labels {
    position: absolute;
    transition: 0.5s;
    width: 250px;
    margin: 15px 0 15px 15px;
    overflow-y: scroll;
    height: calc(100vh - 80px);
}

// hide scrollbar but still allow scroll
#matrix-labels::-webkit-scrollbar {
    width: 0 !important;
}

#matrix-labels.element {
    overflow: -moz-scrollbars-none;
}

.axis-label {
    transition: 0.5s;
    margin-bottom: 0;
}

.axis-label span {
    display: block;
    font-size: smaller;
    transition: 0.5s;
}

.noMargin .label {
    margin-top: 0 !important;
}

#num-msg {
    margin-top: 15px;
    width: 235px;
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
    margin-top: 2.5px;
    font-size: small;
    position: absolute;
    right: -110px;
    width: 100px;
    transform: translateY(-100%);
}

#control-buttons {
    width: fit-content;
    margin: 5px auto 0;
    transform: translateX(-10px);
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
    padding: 0;
    transition: 0.5s;
    // width: 100%;

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
    right: 15px;
    padding: 0;
    font-size: small;
    color: #888 !important;
}

// img/sentence info
#top-right-box {
    max-width: 200px;
}

#top-right-box,
#bottom-left-box {
    position: absolute;
    top: 15px;
    right: 15px;
    margin-bottom: 0;
    z-index: 10;
}

#bottom-left-box {
    position: absolute;
    bottom: 70px;
    left: 15px;
    z-index: 10;
    top: unset;
    right: unset;
}

// clear attn bttn
#clear-attn {
    position: absolute;
    left: 50%;
    top: 65px;
    transform: translate(-50%);
    z-index: 10;
    transition: 0.5s;
}

.label-grid {
    display: flex;
    column-gap: 5px;
    width: 235px;
}

.align-top {
    align-items: baseline;
    display: flex;
    justify-content: space-between;
}

.align-top p {
    margin-bottom: 0 !important;
}

#attn-msg {
    max-width: 235px;
}
</style>
