<template>
    <div v-if="modelType == 'bert' || modelType == 'gpt'">
        <!-- show bert/gpt attention -->
        <div class="row" :class="{ splitcol: showAgg }">
            <AttnMap :myID="'sentAttn'" :otherID="'aggAttn'" />
        </div>
        <Transition>
            <div class="row splitcol" v-show="showAgg && view == 'attn'">
                <AggAttnMap :myID="'aggAttn'" :otherID="'sentAttn'" />
            </div>
        </Transition>
        <Transition>
            <a-button id="show-agg" type="primary" @click="showAggAttention" v-show="!showAgg && view == 'attn'">
                show aggregate attention
            </a-button>
        </Transition>
    </div>
    <div v-else>
        <!-- show vit attention -->
        <ImageAttnMap />
    </div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch } from "vue";
import * as _ from "underscore";
import { useStore } from "@/store/index";
import AttnMap from "./AttnMap.vue";
import AggAttnMap from "./AggAttnMap.vue";
import ImageAttnMap from "./ImageAttnMap.vue";

export default {
    components: { AttnMap, AggAttnMap, ImageAttnMap },
    setup() {
        const store = useStore();

        const state = reactive({
            modelType: computed(() => store.state.modelType),
            view: computed(() => store.state.view),
            hideFirst: false,
            hideLast: false,
            weightByNorm: false,
            showAgg: computed(() => store.state.showAgg)
        });

        // show aggregate attention
        const showAggAttention = () => {
            store.commit("setShowAgg", true);
        }

        return {
            ...toRefs(state),
            showAggAttention
        };
    },
};
</script>

<style lang="scss">
.viewHead {
    margin-left: 10px;
    margin-top: 10px;
    background-color: transparent !important;
}

#show-agg {
    margin: auto;
    position: relative;
    display: block;
}

.align-top {
    align-items: baseline;
    display: flex;
    justify-content: space-between;
}

.align-top p {
    margin-bottom: 0 !important;
}

.attn-btns span {
    margin: 0 2px;
}

#attn-clear,
#attn-reset,
#hide-agg {
    position: relative;
    padding: 0;
    height: auto;
    display: inline-block;
}

.subtitle {
    font-family: monospace;
    font-size: small;
}

.bertviz,
#bertviz {
    margin-top: 15px !important;
}

#bertviz.image-viz {
    width: 200px !important;
    transform: translateX(-50%);
    left: 50%;
    height: 400px !important;
}

.bertviz,
#vis {
    width: fit-content !important;
    display: inline-block;
    background-color: transparent !important;
}

#vis {
    overflow-y: scroll;
    max-height: calc(90vh - 150px);
    padding-bottom: 10px;
}

.splitcol #vis {
    max-height: calc(50vh - 130px) !important;
}

// hide scrollbar but still allow scroll
#vis::-webkit-scrollbar {
    width: 0 !important;
}

#vis.element {
    overflow: -moz-scrollbars-none;
}

#main-svg {
    width: auto !important;
}

text.bold {
    font-weight: bold;
}

text.bold.query {
    fill: var(--query-label);
}

text.bold.key {
    fill: var(--key-label);
}

.token-text {
    fill: var(--text);
}

.background {
    fill: var(--token-hover);
}

.hide {
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
}

.checkbox-contain {
    display: flex;
}

.half {
    width: 50%;
    display: inline-block;
}
</style>