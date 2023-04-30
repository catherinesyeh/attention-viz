<template>
    <div class="viewHead" id="image-attn-map-view" v-show="showAttn">
        <div class="align-top">
            <p>Image View<a-tooltip placement="top">
                    <template #title>
                        <span>q-k attention patterns for a single image</span>
                    </template>
                    <font-awesome-icon icon="info" class="info-icon" />
                </a-tooltip>
            </p>
        </div>
        <p class="subtitle" v-show="showAttn">{{ attnMsg }}</p>
        <Transition>
            <div v-show="showAttn">
                <p class="label">Show<a-tooltip placement="leftTop">
                        <template #title>
                            <span>visualization options:</span>
                            <ul>
                                <li><i>attention to selected token</i>: heatmap for selected token; opacity denotes
                                    attention weight</li>
                                <li><i>highest attention to each token</i>: top attention connection for each token in image
                                </li>
                                <li><i>all high attention flows</i>: all strong connections in image; size and opacity
                                    denote
                                    attention weight</li>
                            </ul>
                        </template>
                        <font-awesome-icon icon="info" class="info-icon" />
                    </a-tooltip></p>
                <a-select v-model:value="vizType" style="width: 285px" :options="vizOptions">
                </a-select>
            </div>
        </Transition>
        <Transition>
            <div v-show="showAttn" style="position:relative">
                <canvas id="bertviz" class="image-viz" />
                <div id="white-square" v-show="userTheme != 'light-theme' && vizType == 'all_top'"></div>
            </div>
        </Transition>
        <Transition>
            <div class="note" v-show="vizType != 'cur_token'">
                <p class="subtitle">
                    <b>square</b> = attention to [cls] token
                </p>
                <p class="subtitle">
                    <b>circle arrow</b> = attention to self
                </p>
            </div>
        </Transition>
    </div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch } from "vue";
import * as _ from "underscore";
import { useStore } from "@/store/index";
import { BitmapLayer } from "@deck.gl/layers/typed";
import { Deck } from "@deck.gl/core/typed";

export default {
    components: {},
    setup() {
        const store = useStore();

        const state = reactive({
            attentionByToken: computed(() => store.state.attentionByToken),
            showAttn: computed(() => store.state.showAttn),
            attnMsg: "attention within selected image",
            highlightedTokenIndices: computed(() => store.state.highlightedTokenIndices),
            view: computed(() => store.state.view),
            mode: computed(() => store.state.mode),
            attentionLoading: computed(() => store.state.attentionLoading),
            userTheme: computed(() => store.state.userTheme),
            vizType: "top_arrow",
            vizOptions: [
                {
                    value: "cur_token",
                    label: "attention to selected token"
                },
                {
                    value: "top_arrow",
                    label: "highest attention to each token"
                },
                {
                    value: "all_top",
                    label: "all high attention flows"
                }
            ]
        });

        let deckgl2 = {} as Deck;

        // start bertviz for images
        const bertviz = () => {
            document.querySelectorAll("canvas#bertviz + .deck-tooltip").forEach((v) => v.remove());
            // parse info from data
            let { attentionByToken } = state;

            const toOriginalImageLayer = new BitmapLayer({
                id: 'bertviz-image',
                bounds: [-70, 2.5, 70, 80.5],
                image: attentionByToken.token.originalImagePath,
                pickable: false,
            });

            const toOverlaidlImageLayer = new BitmapLayer({
                id: 'bertviz-overlay',
                bounds: [-70, -84.5, 70, -2.5],
                image: attentionByToken.token.originalPatchPath,
                pickable: false,
            });

            const toArrowedlImageLayer = new BitmapLayer({
                id: 'bertviz-arrowed',
                bounds: [-70, -80.5, 70, -2.5],
                image: attentionByToken.token.sentence,
                pickable: false,
            });

            const toPatchedImageLayer = new BitmapLayer({
                id: 'patched-image',
                bounds: [-70, 2.5, 70, 80.5],
                image: attentionByToken.token.value,
                pickable: false,
            });

            const toArrowedLayer = new BitmapLayer({
                id: 'bertviz-pure',
                bounds: [-70, -80.5, 70, -2.5],
                image: attentionByToken.token.length,
                pickable: false,
            });

            if (state.vizType == "all_top") { // attn flow only (but all top attn lines shown)
                deckgl2 = new Deck({
                    canvas: "bertviz",
                    layers: [toPatchedImageLayer, toArrowedLayer]
                });
            }
            else if (state.vizType == "top_arrow") { // top attn arrow for whole image
                deckgl2 = new Deck({
                    canvas: "bertviz",
                    layers: [toOriginalImageLayer, toArrowedlImageLayer]
                });
            } else { // heatmap for current patch
                deckgl2 = new Deck({
                    canvas: "bertviz",
                    layers: [toOriginalImageLayer, toOverlaidlImageLayer]
                });
            }

            if (state.attentionLoading) {
                // set to false if still loading
                store.commit('updateAttentionLoading', false);

            }

        }
        const clearAttn = () => {
            if (state.view != "search") {
                store.commit("setHighlightedTokenIndices", []);
            }
        }

        watch(
            () => [state.attentionByToken, state.vizType],
            () => {
                // draw attention plot
                if (!state.showAttn) {
                    store.commit("setShowAttn", true);
                }
                bertviz();
            }
        );

        watch(
            () => [state.view, state.mode],
            () => {
                if (state.view != 'attn') {
                    store.commit("setShowAttn", false);
                }
            }
        )

        watch(
            () => [state.showAttn],
            () => {
                if (!state.showAttn) {
                    clearAttn();
                }
            }
        )

        return {
            ...toRefs(state),
            clearAttn,
            bertviz
        };
    },
};
</script>

<style lang="scss">
.note {
    position: absolute;
    top: 560px;
    width: 300px;
    text-align: center;
    margin-left: -7.5px !important;
}

.note .subtitle {
    margin: 0 ! important;
}

#white-square {
    width: 200px;
    height: 200px;
    position: absolute;
    top: 265px;
    z-index: -1;
    background: white;
    transform: translateX(-50%) translateY(-40px);
    left: 50%;
}
</style>