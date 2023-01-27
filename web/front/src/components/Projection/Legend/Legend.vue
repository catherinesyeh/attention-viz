<template>
    <div id="legend" v-show="!renderState">
        <div class="bar-contain" :class="{
            pos: colorBy == 'position' || colorBy == 'norm' || colorBy == 'length', cat: colorBy == 'categorical', pun: colorBy == 'punctuation'
        }">
            <span>q</span>
            <div class="bar" :class="{ smaller: colorBy == 'norm' || colorBy == 'punctuation' }">
                <span class="low">{{ lowLabel(colorBy) }}</span>
                <span class="high">{{ highLabel(colorBy) }}</span>
            </div>
        </div>
        <div class="bar-contain k" :class="{
            pos: colorBy == 'position' || colorBy == 'norm' || colorBy == 'length', cat: colorBy == 'categorical', pun: colorBy == 'punctuation'
        }">
            <span>k</span>
            <div class="bar" :class="{ smaller: colorBy == 'norm' || colorBy == 'punctuation' }">
                <span class="low">{{ lowLabel(colorBy) }}</span>
                <span class="high">{{ highLabel(colorBy) }}</span>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch, ref, defineComponent } from "vue";
import { useStore } from "@/store/index";

export default defineComponent({
    setup() {
        const store = useStore();

        const state = reactive({
            colorBy: computed(() => store.state.colorBy),
            renderState: computed(() => store.state.renderState)
        });

        return {
            ...toRefs(state),
        };
    },
    methods: {
        lowLabel(colorBy: string) {
            switch (colorBy) {
                case 'position':
                case 'categorical':
                case 'length':
                    return "0"
                case 'norm':
                    return "low"
                case 'punctuation':
                    return ".?!"
                default:
                    ""
            }
        },
        highLabel(colorBy: string) {
            switch (colorBy) {
                case 'position':
                case 'length':
                    return "1"
                case 'categorical':
                    return "4"
                case 'norm':
                    return "high"
                case 'punctuation':
                    return "abc"
                default:
                    ""
            }
        }
    },
})

</script>

<style lang="scss">
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
    position: relative;
}

.bar-contain.k .bar {
    background: rgb(227, 55, 143);
}

/* position or norm */
.bar-contain.pos .bar {
    background: linear-gradient(45deg, #D3EDA1, #82CA7C, #00482A);
}

.bar-contain.k.pos .bar {
    background: linear-gradient(45deg, #CEA1CE, #E33F97, #5E021B);
}

/* categorical */
.bar-contain.cat .bar {
    background: linear-gradient(#7F5BDB 20%,
            #2E93D9 20% 40%,
            #5FB96C 40% 60%,
            #F39226 60% 80%,
            #E3378F 80%);
}

.bar-contain.k.cat .bar {
    background: linear-gradient(#CFB0EF 20%,
            #9fd2ea 20% 40%,
            #addfa2 40% 60%,
            #f5ca86 60% 80%,
            #FFB5CF 80%);
}

/* categorical */
.bar-contain.pun .bar {
    background: linear-gradient(#5FB96C 50%,
            #2E93D9 50%);
}

.bar-contain.k.pun .bar {
    background: linear-gradient(#E3378F 50%,
            #F39226 50%);
}

/* bar labels */
.bar span {
    display: block;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: small;
    transition: 0.5s;
    color: white;
}

.bar.smaller span {
    font-size: x-small;
}

.bar .high {
    top: 5px;
}

.bar .low {
    bottom: 5px;
}
</style>