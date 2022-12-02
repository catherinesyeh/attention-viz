<template>
    <div>
        <!-- View: Head: {{ data.head }} Layer: {{ data.layer }} -->
        <!-- <canvas :id="id" class="height: 100%; width=100%"> </canvas> -->
        <svg :id="id" class="height: 100%; width=100%"></svg>
    </div>
</template>

<script lang="ts">
import {
    defineComponent,
    onMounted,
    computed,
    reactive,
    toRefs,
    h,
    watch,
    PropType,
    onUnmounted,
} from "vue";
import * as _ from "underscore";
import * as d3 from "d3";

import { useStore } from "@/store/index";
import { Typing } from "@/utils/typing";
import createScatterplot from "regl-scatterplot";

interface Point {
    x: number;
    y: number;
}

// function fitToContainer(canvas: HTMLCanvasElement) {
//     // Make it visually fill the positioned parent
//     canvas.style.width = "100%";
//     canvas.style.height = "100%";
//     // ...then set the internal size to match
//     canvas.width = canvas.offsetWidth;
//     canvas.height = canvas.offsetHeight;
// }

function fitToContainer(svg: HTMLElement) {
    let parent = svg.parentElement;
    if (parent == null) return;

    d3.select(svg)
        .attr('width', parent.clientWidth)
        .attr('height', parent.clientHeight)
}

export default defineComponent({
    components: {},
    props: {
        data: {
            type: Object as PropType<Typing.MatrixData>,
            required: true,
        },
    },
    setup(props) {
        const store = useStore();

        const state = reactive({
            id: "l" + props.data.layer + "h" + props.data.head,
        });

        const drawSVG = (data: Typing.TokenData[]) => {
            console.log(`#${state.id}`);
            const svg = document.getElementById(state.id);
            if (svg == null) return;
            fitToContainer(svg);

            const bbox = svg.getBoundingClientRect();
            console.log(state.id, bbox);

            let xScale = d3
                .scaleLinear()
                .domain(d3.extent(data.map((x) => x.tsne_x)) as any)
                .range([0, bbox.width]);
            let yScale = d3
                .scaleLinear()
                .domain(d3.extent(data.map((x) => x.tsne_y)) as any)
                .range([0, bbox.height]);
            const points = data.map((d) => ({
                x: xScale(d.tsne_x),
                y: yScale(d.tsne_y)
            })) as Point[];

            d3.select(`#${state.id}`)
                .selectAll('circle').data<Point>(points).enter()
                .append('circle')
                .attr('cx', d => d.x)
                .attr('cy', d => d.y)
                .attr('r', '1px')
        };

        const drawCanvas = (data: Typing.TokenData[]) => {
            const canvas = document.querySelector(`#${state.id}`) as HTMLCanvasElement;
            fitToContainer(canvas);

            console.log(state.id, canvas);

            if (canvas === null) return;

            const { width, height } = canvas.getBoundingClientRect();
            const scatterplot = createScatterplot({
                canvas,
                width,
                height,
                pointSize: 5,
            });

            let xScale = d3
                .scaleLinear()
                .domain(d3.extent(data.map((x) => x.tsne_x)) as any)
                .range([-1, 1]);
            let yScale = d3
                .scaleLinear()
                .domain(d3.extent(data.map((x) => x.tsne_y)) as any)
                .range([-1, 1]);
            const points = data.map((d) => [xScale(d.tsne_x), yScale(d.tsne_y)]);
            console.log(points);

            scatterplot.draw(points);
        };

        onMounted(() => {
            // drawCanvas(props.data.tokens);
            drawSVG(props.data.tokens);
        });

        return {
            ...toRefs(state),
        };
    },
});
</script>

<style lang="scss">
.viewHead {
    margin-left: 10px;
}

</style>
