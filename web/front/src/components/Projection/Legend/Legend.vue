<template>
    <Transition>
        <div class="legend-box" v-show="!renderState">
            <div id="legend" v-show="colorBy != 'no_outline'">
                <div class="bar-contain" :class="{
                        pos: colorBy == 'row' || colorBy == 'column' || colorBy == 'position' || colorBy == 'embed_norm' || colorBy == 'token_length' || colorBy == 'sent_length', cat: colorBy == 'pos_mod_5', pun: colorBy == 'punctuation'
                    }">
                    <span>q</span>
                    <div class="bar">
                        <span class="low">{{ lowLabel() }}</span>
                        <span class="high">{{ highLabel() }}</span>
                    </div>
                </div>
                <div class="bar-contain k" :class="{
                    pos: colorBy == 'row' || colorBy == 'column' || colorBy == 'position' || colorBy == 'embed_norm' || colorBy == 'token_length' || colorBy == 'sent_length', cat: colorBy == 'pos_mod_5', pun: colorBy == 'punctuation'
                }">
                    <span>k</span>
                    <div class="bar">
                        <span class="low">{{ lowLabel() }}</span>
                        <span class="high">{{ highLabel() }}</span>
                    </div>
                </div>
            </div>
            <p id="legend-msg" class="subtitle"><b>color info:</b> {{ colorMsg }}</p>
        </div>
    </Transition>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch, ref, defineComponent } from "vue";
import { useStore } from "@/store/index";

export default defineComponent({
    setup(props, context) {
        const store = useStore();

        const state = reactive({
            colorBy: computed(() => store.state.colorBy),
            renderState: computed(() => store.state.renderState),
            modelType: computed(() => store.state.modelType),
            colorMsg: ""
        });

        const lowLabel = () => {
            switch (state.colorBy) {
                case 'position':
                case 'pos_mod_5':
                case 'token_length':
                case 'row':
                case 'column':
                case 'sent_length':
                    return "0"
                case 'embed_norm':
                    return "low"
                case 'punctuation':
                    return ".?!"
                default:
                    ""
            }
        }
        const highLabel = () => {
            switch (state.colorBy) {
                case 'position':
                case 'token_length':
                case 'sent_length':
                    return "1"
                case 'row':
                case 'column':
                    return state.modelType == "vit-16" ? 13 : 6
                case 'pos_mod_5':
                    return "4"
                case 'embed_norm':
                    return "high"
                case 'punctuation':
                    return "abc"
                default:
                    ""
            }
        }

        // change msg below legend
        const setColorMsg = (msg: string) => {
            state.colorMsg = msg;
        }

        context.expose({
            setColorMsg
        });

        return {
            ...toRefs(state),
            highLabel,
            lowLabel
        };
    }
})

</script>

<style lang="scss">
.legend-box {
    // margin-right: 10px;
    transition: 0.5s;
    position: absolute;
    // top: 45%;
    bottom: 110px;
    left: 10px;
    max-width: 200px;
    // transform: translateY(-50%);
}

#legend {
    display: flex;
}

.bar-contain {
    text-align: center;
    margin: 10px;
}

/* default: type */
.bar {
    height: calc(20px + 0.2vw);
    max-height: 300px;
    width: calc(20px + 0.2vw);
    background: rgb(95, 185, 108);
    margin-top: 5px;
    transition: 0.5s;
    position: relative;
}

.bar-contain.k .bar {
    background: rgb(227, 55, 143);
}

/* position or norm */
.bar-contain.pos .bar {
    background: linear-gradient(45deg, #D3EDA1, #82CA7C, #00482A);
    height: calc(100px + 1vw);
}

.bar-contain.k.pos .bar {
    background: linear-gradient(45deg, #CEA1CE, #E33F97, #5E021B);
}

/* categorical */
.bar-contain.cat .bar {
    background: linear-gradient(#A144DB 20%,
            #528DDB 20% 40%,
            #5FB96C 40% 60%,
            #EDB50E 60% 80%,
            #E3378F 80%);
    height: calc(100px + 1vw);
}

.bar-contain.k.cat .bar {
    background: linear-gradient(#D6BAE3 20%,
            #C8DDED 20% 40%,
            #C4D6B8 40% 60%,
            #F0D6A5 60% 80%,
            #F5C0CA 80%);
}

/* categorical */
.bar-contain.pun .bar {
    background: linear-gradient(#F39226 50%, #5FB96C 50%);
    height: calc(40px + 0.4vw);
}

.bar-contain.k.pun .bar {
    background: linear-gradient(#E3378F 50%, #2E93D9 50%);
}

/* bar labels */
.bar span {
    display: block;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: x-small;
    transition: 0.5s;
    color: white;
}

.bar .high {
    top: 5px;
}

.bar .low {
    bottom: 5px;
}
</style>