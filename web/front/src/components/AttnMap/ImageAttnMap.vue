<template>
    <div class="viewHead" id="image-attn-map-view">
        <div class="align-top">
            <p>Image View
                <Transition>
                    <span v-show="showAttn">({{ layerHead }})</span>
                </Transition>
            </p>
            <Transition>
                <div class="attn-btns" v-show="showAttn">
                    <a-button id="attn-reset" class="clear" type="link" @click="resetAttn">reset</a-button>
                    <span>|</span>
                    <a-button id="attn-clear" class="clear" type="link" @click="clearAttn">clear</a-button>
                </div>
            </Transition>
        </div>
        <span class="subtitle">{{ attnMsg }}</span>
        <Transition>
            <div v-show="showAttn">
                <a-checkbox v-model:checked="overlayAttn" @click="overlayAttnMap">Show Attn Arrows</a-checkbox>
            </div>
        </Transition>
        <Transition>
            <div v-show="overlayAttn">
                <a-checkbox v-model:checked="lineOnly" @click="lineOnlyAttnMap">Attn Flow Only</a-checkbox>
            </div>
        </Transition>
        <Transition>
            <div v-show="showAttn">
                <canvas id="bertviz" class="image-viz" />
            </div>
        </Transition>
    </div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch } from "vue";
import * as _ from "underscore";
import { useStore } from "@/store/index";
import { BitmapLayer, IconLayer } from "@deck.gl/layers/typed";
import { COORDINATE_SYSTEM, Deck } from "@deck.gl/core/typed";

export default {
    components: {},
    setup() {
        const store = useStore();

        const state = reactive({
            attentionByToken: computed(() => store.state.attentionByToken),
            showAttn: computed(() => store.state.showAttn),
            attnMsg: "click a plot to zoom in",
            highlightedTokenIndices: computed(() => store.state.highlightedTokenIndices),
            view: computed(() => store.state.view),
            curLayer: computed(() => store.state.layer),
            curHead: computed(() => store.state.head),
            layerHead: "",
            userTheme: computed(() => store.state.userTheme),
            mode: computed(() => store.state.mode),
            model: computed(() => store.state.modelType),
            attn_vals: [] as number[][],
            attentionLoading: computed(() => store.state.attentionLoading),
            overlayAttn: false,
            lineOnly: false,
        });

        let deckgl2 = {} as Deck;

        if (state.view != "attn") { // set msg just in case
            state.attnMsg = state.mode == "single"
                ? "click a point to explore its attention"
                : "click a plot to zoom in";
        }

        // start bertviz for images
        const bertviz = () => {
            document.querySelectorAll("canvas#bertviz + .deck-tooltip").forEach((v) => v.remove());
            // parse info from data
            let { attentionByToken } = state;
            // state.attn_vals = attentionByToken.attns;

            // const layer = attentionByToken.layer;
            // const head = attentionByToken.head;
            state.layerHead = "L" + state.curLayer + " H" + state.curHead;

            const toOriginalImageLayer = new BitmapLayer({
                id: 'bertviz-image',
                bounds: [-70, 2.5, 70, 80.5],
                // bounds: [-490, 67, -350, 88],
                image: attentionByToken.token.originalImagePath,
                pickable: false,
            });

            const toOverlaidlImageLayer = new BitmapLayer({
                id: 'bertviz-overlay',
                bounds: [-70, -84.5, 70, -2.5],
                // bounds: [-490, -50, -350, 65],
                image: attentionByToken.token.originalPatchPath,
                pickable: false,
            });

            const toArrowedlImageLayer = new BitmapLayer({
                id: 'bertviz-arrowed',
                bounds: [-70, -80.5, 70, -2.5],
                // bounds: [-490, -50, -350, 65],
                image: attentionByToken.token.sentence,
                pickable: false,
            });

            const toPatchedImageLayer = new BitmapLayer({
                id: 'patched-image',
                bounds: [-70, 2.5, 70, 80.5],
                // bounds: [-490, -50, -350, 65],
                image: attentionByToken.token.value,
                pickable: false,
            });

            const toArrowedLayer = new BitmapLayer({
                id: 'bertviz-pure',
                bounds: [-70, -80.5, 70, -2.5],
                // bounds: [-490, -50, -350, 65],
                image: attentionByToken.token.length,
                pickable: false,
            });

            if (state.overlayAttn && state.lineOnly) {
                // deckgl2.setProps({ layers: [toOriginalImageLayer, toOverlaidlImageLayer] });
                deckgl2 = new Deck({
                    canvas: "bertviz",
                    // initialViewState: viewState,
                    layers: [toPatchedImageLayer, toArrowedLayer]
                });
            }
            else if (state.overlayAttn) {
                
                deckgl2 = new Deck({
                    canvas: "bertviz",
                    // initialViewState: viewState,
                    layers: [toOriginalImageLayer, toArrowedlImageLayer]
                });
            } else {
                // deckgl2.setProps({ layers: [toOriginalImageLayer] });
                deckgl2 = new Deck({
                    canvas: "bertviz",
                    // initialViewState: viewState,
                    layers: [toOriginalImageLayer, toOverlaidlImageLayer]
                });
            }

            if (state.attentionLoading) {
                // set to false if still loading
                store.commit('updateAttentionLoading', false);

            }

        }
        const clearAttn = () => {
            store.commit("setShowAttn", false);
            state.attnMsg = state.mode == "single"
                ? "click a point to explore its attention"
                : "click a plot to zoom in";
            store.commit("setHighlightedTokenIndices", []);
        }

        const resetAttn = () => {
            store.commit("setResetAttn", true);
            bertviz();
        }

        const overlayAttnMap = () => {
            state.overlayAttn = !state.overlayAttn;
            bertviz();
        }

        const lineOnlyAttnMap = () => {
            state.lineOnly = !state.lineOnly;
            bertviz();
        }

        watch(
            () => [state.attentionByToken],
            () => {
                // draw attention plot
                store.commit("setShowAttn", true);
                state.attnMsg = "click a token to toggle lines off/on";
                bertviz();
            }
        );

        watch(
            () => [state.view, state.mode],
            () => {
                if (state.view != 'attn') {
                    store.commit("setShowAttn", false);
                    state.attnMsg = state.mode == "single"
                        ? "click a point to explore its attention"
                        : "click a plot to zoom in";
                }
            }
        )

        return {
            ...toRefs(state),
            clearAttn,
            bertviz,
            resetAttn,
            overlayAttnMap,
            lineOnlyAttnMap,
        };
    },
};
</script>

<style lang="scss"></style>