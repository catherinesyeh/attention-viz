<template>
    <div id="imgdata-wrapper">
        <canvas id="image-data" />
    </div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch, ref, defineComponent } from "vue";
import { useStore } from "@/store/index";
import { IconLayer } from "@deck.gl/layers/typed";
import { Deck } from "@deck.gl/core/typed";

export default defineComponent({
    setup(props, context) {
        const store = useStore();

        const state = reactive({
            renderState: computed(() => store.state.renderState),
            modelType: computed(() => store.state.modelType),
            mode: computed(() => store.state.mode)
        });

        // start bertviz for images
        const drawGrid = (images: string[]) => {
            console.log("here!");
            document.querySelectorAll("canvas#image-data + .deck-tooltip").forEach((v) => v.remove());
            // parse info from data

            let deckgl3 = {} as Deck;

            const num_images = images.length;
            const num_cols = 4;
            const num_rows = Math.ceil(num_images / num_cols);

            const width = 48;
            const half_w = width * 0.5;
            const threefourth_w = width * 0.75;
            const start_x = -half_w * (num_cols / 2) - 5;
            const start_y = threefourth_w * (num_rows / 2);
            console.log(num_images, num_cols, num_rows, start_x, start_y);

            const getPos = (ind: number) => {
                const x = start_x + (ind % num_cols) * (threefourth_w - 1);
                const r = Math.floor(ind / (num_rows + 1));
                let y = start_y - r * (threefourth_w - 1.5);
                if (r == 0) {
                    y -= (half_w / 4);
                }
                return [x, y];
            }

            let imageData = images.map(i => [getPos(images.indexOf(i)), i]);
            console.log(imageData.map(i => i[0]));

            const toImageLayer = new IconLayer({
                id: 'data-image-layer',
                pickable: false,
                data: imageData,
                stroked: false,
                getIcon: d => ({
                    url: d[1],
                    width: width,
                    height: width,
                }),
                getPosition: d => d[0],
                getSize: width,
                sizeScale: 1,
                sizeUnits: "pixels",
            });

            deckgl3 = new Deck({
                canvas: "image-data",
                layers: [toImageLayer],
                controller: false,
            })
        };

        context.expose({
            drawGrid
        });

        return {
            ...toRefs(state)
        };
    }
})

</script>

<style lang="scss">
#imgdata-wrapper {
    width: 200px;
    height: 200px;
    display: flex;
    align-items: center;
    pointer-events: none !important;
    cursor: default !important;
}
</style>