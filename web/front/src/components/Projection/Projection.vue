<!-- Vue components: https://vuejs.org/guide/essentials/component-basics.html -->
<template>
    <div>
        <!-- Matrix View -->
        <div id="matrix-wrapper">
            <div id="label-wrapper">
                <span id="loading" v-show="renderState">Loading...</span>
                <Transition>
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
                            :class="{ disabled: disableLabel }">show all</a-checkbox>

                        <p class="label">Mode</p>
                        <a-radio-group v-model:value="mode">
                            <a-radio-button value="single">single</a-radio-button>
                            <a-radio-button value="matrix">matrix</a-radio-button>
                        </a-radio-group>

                        <p class="label">Developer Tool</p>
                        <a-button type="primary" @click="logViewport">
                            log viewport
                        </a-button>
                    </div>
                </Transition>
            </div>
            <div class="gradient-edge"></div>
            <div class="gradient-edge right">
                <div id="legend">
                    <div class="bar-contain" :class="{
                        pos: colorBy == 'position' || colorBy == 'norm', cat: colorBy == 'categorical'
                    }">
                        <span>q</span>
                        <div class="bar"></div>
                    </div>
                    <div class="bar-contain k" :class="{
                        pos: colorBy == 'position' || colorBy == 'norm', cat: colorBy == 'categorical'
                    }">
                        <span>k</span>
                        <div class="bar"></div>
                    </div>
                </div>
            </div>
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
            renderState: computed(() => store.state.renderState),
            searchToken: "",
            view: computed(() => store.state.view),
            showAll: computed(() => store.state.showAll),
            disableLabel: computed(() => store.state.disableLabel),
            colorBy: computed(() => store.state.colorBy)
        });

        const onClickReset = () => {
            if (state.mode === 'matrix') {
                (matrixView.value as any).reset();
            }
        }

        const clearSearch = () => {
            state.searchToken = "";
            onSearch(state.searchToken);
        }

        const onSearch = (str: string) => {
            store.commit("setView", "search");
            let num_results = (matrixView.value as any).onSearch(str);
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

        // restyle plots
        const changeGraphType = (str: string) => {
            (matrixView.value as any).changeGraphType(str);
        }

        const changeColor = (str: string) => {
            (matrixView.value as any).changeColor(str);
        }

        // zoom to single plot
        const zoomToPlot = (layer: number, head: number) => {
            (matrixView.value as any).zoomToPlot(layer, head);
        }

        watch(() => state.view,
            () => {
                if (state.view != "search") {
                    state.searchToken = "";
                }
            })

        return {
            ...toRefs(state),
            matrixView,
            onClickReset,
            clearSearch,
            onSearch,
            logViewport,
            changeGraphType,
            changeColor,
            zoomToPlot,
            toggleCheckbox
        };
    },
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

#legend {
    display: flex;
    justify-content: flex-end;
    margin-right: 10px;
    transition: 0.5s;
}

.bar-contain {
    text-align: center;
    margin: 10px;
}

/* default: type */
.bar {
    height: calc(100vh - 120px);
    width: calc(20px + 0.2vw);
    background: rgb(95, 185, 108);
    margin-top: 10px;
    transition: 0.5s;
}

.bar-contain.k .bar {
    background: rgb(227, 55, 143);
}

/* position */
.bar-contain.pos .bar {
    background: linear-gradient(45deg, #D3EDA1, #82CA7C, #00482A);
}

.bar-contain.k.pos .bar {
    background: linear-gradient(45deg, #CEA1CE, #E33F97, #5E021B);
}

/* categorical */
.bar-contain.cat .bar {
    background: linear-gradient(#e31a1c 20%,
            #ff7f00 20% 40%,
            #33a02c 40% 60%,
            #1f78b4 60% 80%,
            #6a3d9a 80%);
}

.bar-contain.k.cat .bar {
    background: linear-gradient(#fb9a99 20%,
            #fdbf6f 20% 40%,
            #b2df8a 40% 60%,
            #a6cee3 60% 80%,
            #cab2d6 80%);
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
