<template>
    <div id="legend" v-show="!renderState">
        <div class="bar-contain" :class="{
            pos: colorBy == 'position' || colorBy == 'norm', cat: colorBy == 'categorical'
        }">
            <span>q</span>
            <div class="bar" :class="{ smaller: colorBy == 'norm' }">
                <span class="low">{{ lowLabel(colorBy) }}</span>
                <span class="high">{{ highLabel(colorBy) }}</span>
            </div>
        </div>
        <div class="bar-contain k" :class="{
            pos: colorBy == 'position' || colorBy == 'norm', cat: colorBy == 'categorical'
        }">
            <span>k</span>
            <div class="bar" :class="{ smaller: colorBy == 'norm' }">
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
                    return "0"
                case 'categorical':
                    return "0"
                case 'norm':
                    return "low"
                default:
                    ""
            }
        },
        highLabel(colorBy: string) {
            switch (colorBy) {
                case 'position':
                    return "1"
                case 'categorical':
                    return "4"
                case 'norm':
                    return "high"
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
    background: linear-gradient(#6a3d9a 20%,
            #1f78b4 20% 40%,
            #33a02c 40% 60%,
            #ff7f00 60% 80%,
            #e31a1c 80%);
}

.bar-contain.k.cat .bar {
    background: linear-gradient(#cab2d6 20%,
            #a6cee3 20% 40%,
            #b2df8a 40% 60%,
            #fdbf6f 60% 80%,
            #fb9a99 80%);
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