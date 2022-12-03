<!-- Vue components: https://vuejs.org/guide/essentials/component-basics.html -->
<template>
    <div class="viewHead">
        <!-- Matrix View -->
        <div id="matrix-wrapper">
            <canvas id="matrix-canvas" />
        </div>
    </div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch, defineComponent } from "vue";
import * as _ from "underscore";
import * as d3 from "d3";
import { useStore } from "@/store/index";
import { ScatterGL, Point2D } from "scatter-gl";
import createScatterplot from "regl-scatterplot";

import { Typing } from "@/utils/typing";

import { Deck, OrthographicView } from "@deck.gl/core/typed";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers/typed";

interface Point {
    coordinate: Point2D;
    color: any;
    msg: string;
}

interface PlotHead {
    layer: number;
    head: number;
    title: string;
    coordinate: Point2D;
}

/**
 * Fit the canvas to the parent container size
 */
function fitToContainer(canvas: HTMLCanvasElement | HTMLElement) {
    if (canvas instanceof HTMLCanvasElement) {
        // Make it visually fill the positioned parent
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        // ...then set the internal size to match
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    } else if (canvas instanceof HTMLElement) {
        let parent = canvas.parentElement;
        if (parent == null) return;

        d3.select(canvas).attr("width", parent.clientWidth).attr("height", parent.clientHeight);
    }
}

export default defineComponent({
    components: {},
    setup() {
        const store = useStore();

        const state = reactive({
            matrixData: computed(() => store.state.matrixData),
            tokenData: computed(() => store.state.tokenData),
            matrixCellHeight: 100,
            matrixCellWidth: 100,
            matrixCellMargin: 20,
        });

        /**
         * The main function for drawing the scatter matrices
         */
        const drawMatrices = () => {
            let { matrixData, tokenData } = state;
            if (!matrixData.length || !tokenData.length) return;

            const points = computePoints(matrixData, tokenData);
            console.log("drawMatrices", points);

            const textLabels = computeTextLabels(matrixData);

            const canvasWidth =
                _.max(points.map((x) => x.coordinate[0])) +
                _.min(points.map((x) => x.coordinate[0]));
            const canvasHeight =
                _.max(points.map((x) => x.coordinate[1])) +
                _.min(points.map((x) => x.coordinate[1]));

            const deckgl = new Deck({
                canvas: "matrix-canvas",
                // initialViewState: INITIAL_VIEW_STATE,
                controller: true,
                views: new OrthographicView({
                    flipY: false,
                    // near: 0.1,
                    // far: 1000,
                }),
                initialViewState: {
                    target: [canvasWidth / 2, canvasHeight / 2, 0],
                    zoom: -1,
                    minZoom: -2,
                    maxZoom: 40,
                },
                layers: [
                    new ScatterplotLayer({
                        pickable: true,
                        data: points,
                        opacity: 0.5,
                        getPosition: (d: Point) => d.coordinate,
                        getRadius: (d) => 0.4,
                        getFillColor: (d: Point) => d.color,
                        onHover: (info, event) => console.log("Hovered:", info, event),
                    }),
                    new TextLayer({
                        id: "text-layer",
                        data: textLabels,
                        pickable: true,
                        getPosition: (d: PlotHead) => d.coordinate,
                        getText: (d: PlotHead) => d.title,
                        getSize: 10,
                        getAngle: 0,
                        sizeUnits: 'common',
                        getTextAnchor: "start",
                        getAlignmentBaseline: "center",
                        onClick: (info, event) => console.log("Clicked:", info, event),
                    }),
                ],
                getTooltip: ({ object }) => object && object.msg,
            });
        };

        /**
         * Compute text headings for each plot (head-layer)
         */
        const computeTextLabels = (matrixData: Typing.MatrixData[]) => {
            var results = [] as PlotHead[];

            let { matrixCellWidth, matrixCellHeight, matrixCellMargin } = state;
            for (let md of matrixData) {
                results.push({
                    layer: md.layer,
                    head: md.head,
                    title: `L${md.layer} H${md.head}`,
                    coordinate: [
                        md.head * (matrixCellWidth + matrixCellMargin),
                        -md.layer * (matrixCellHeight + matrixCellMargin),
                    ],
                });
            }
            return results;
        };

        /**
         * Offset the points according to the x/y offset per plot
         * Add color and on-hover msg
         */
        const computePoints = (matrixData: Typing.MatrixData[], tokenData: Typing.TokenData[]) => {
            let results = [] as Point[];
            let { matrixCellWidth, matrixCellHeight, matrixCellMargin } = state;
            console.log(matrixCellWidth, matrixCellHeight, matrixCellMargin);

            // compute colors for each token
            const queryColor = d3.scaleSequential().domain([0, 1]).interpolator(d3.interpolatePuRd);
            const keyColor = d3.scaleSequential().domain([0, 1]).interpolator(d3.interpolateYlGn);
            const getColor = (td: Typing.TokenData) => {
                var colorstr = "rgb()";
                if (td.type === "query") {
                    colorstr = queryColor(td.position);
                } else if (td.type === "key") {
                    colorstr = keyColor(td.position);
                }
                let color = d3.color(colorstr)?.rgb();
                if (!color) return [0, 0, 0];
                return [color.r, color.g, color.b];
            };
            const colors = tokenData.map((td) => getColor(td));

            // compute msgs for each token
            const msgs = tokenData.map(
                (td) => `${td.value} (type: ${td.type}, position: ${td.position.toFixed(2)})`
            );

            // loop each plot (layer-head pair)
            for (let md of matrixData) {
                // compute plot-wise offset
                let xoffset = md.head * (matrixCellWidth + matrixCellMargin);
                let yoffset = -md.layer * (matrixCellHeight + matrixCellMargin);
                console.log(`compute data: layer ${md.layer}, head ${md.head}`);

                // compute coordinates for each token
                let data = md.tokens;
                let xScale = d3
                    .scaleLinear()
                    .domain(d3.extent(data.map((x) => x.tsne_x)) as any)
                    .range([0, matrixCellWidth]);
                let yScale = d3
                    .scaleLinear()
                    .domain(d3.extent(data.map((x) => x.tsne_y)) as any)
                    .range([0, matrixCellHeight]);
                let points = data.map((d, idx) => ({
                    coordinate: [xScale(d.tsne_x) + xoffset, yScale(d.tsne_y) + yoffset] as Point2D,
                    color: colors[idx],
                    msg: msgs[idx],
                }));

                results.push(...points);
            }

            return results;
        };

        watch(
            () => state.matrixData,
            () => {
                drawMatrices();
            }
        );

        watch(
            () => state.tokenData,
            () => {
                drawMatrices();
            }
        );

        onMounted(() => drawMatrices());

        return {
            ...toRefs(state),
        };
    },
});
</script>

<style lang="scss" scoped>
div#matrix-wrapper {
    position: relative;
    height: 100vh;
    width: 100%;

    canvas {
        height: 100%;
        width: 100%;
    }
}

div.matrix-cell {
    position: absolute;
    border: 1px solid #1d1d1f;
}
</style>
