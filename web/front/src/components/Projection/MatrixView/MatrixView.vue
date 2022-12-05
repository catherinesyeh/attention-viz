<!-- Vue components: https://vuejs.org/guide/essentials/component-basics.html -->
<template>
    <canvas id="matrix-canvas" />
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch, defineComponent } from "vue";
import * as _ from "underscore";
import * as d3 from "d3";
import { useStore } from "@/store/index";
import { ScatterGL, Point2D } from "scatter-gl";

import { Typing } from "@/utils/typing";

import { Deck, OrthographicView } from "@deck.gl/core/typed";
// import interface {Deck} from "@deck.gl/core/typed";
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

interface ViewState {
    target: number[];
    zoom: number;
    minZoom: number;
    maxZoom: number;
}
const nullInitialView: ViewState = {
    target: [0, 0, 0],
    zoom: -1,
    minZoom: -2,
    maxZoom: 40,
};

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
    setup(props, context) {
        const store = useStore();

        const state = reactive({
            matrixData: computed(() => store.state.matrixData),
            attentionData: computed(() => store.state.attentionData),
            tokenData: computed(() => store.state.tokenData),
            matrixCellHeight: 100,
            matrixCellWidth: 100,
            matrixCellMargin: 20,
            viewState: nullInitialView,
        });

        var deckgl = {} as Deck;

        /**
         * The main function for drawing the scatter matrices
         */
        const drawMatrices = () => {
            store.commit("updateRenderState", true);

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

            state.viewState = {
                target: [canvasWidth / 2, canvasHeight / 2, 0],
                zoom: -1,
                minZoom: -2,
                maxZoom: 40,
            };

            deckgl = new Deck({
                canvas: "matrix-canvas",
                controller: true,
                views: new OrthographicView({
                    flipY: false,
                }),
                initialViewState: state.viewState,
                layers: [
                    new ScatterplotLayer({
                        pickable: true,
                        data: points,
                        opacity: 0.5,
                        getPosition: (d: Point) => d.coordinate,
                        getRadius: (d: Point) => 0.4,
                        getFillColor: (d: Point) => d.color,
                        onClick: (info, event) => console.log("Clicked:", info, event),
                    }),
                    new TextLayer({
                        id: "text-layer",
                        data: textLabels,
                        pickable: true,
                        getPosition: (d: PlotHead) => d.coordinate,
                        getText: (d: PlotHead) => d.title,
                        getSize: 10,
                        getAngle: 0,
                        sizeUnits: "common",
                        getTextAnchor: "start",
                        getAlignmentBaseline: "center",
                        // onClick: (info, event) => console.log("Clicked:", info, event),
                    }),
                ],
                getTooltip: ({ object }) =>
                    object && {
                        html: object.msg,
                        style: {
                            color: "#fff",
                        },
                    },
            });

            store.commit("updateRenderState", false);
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
            const queryColor = d3.scaleSequential().domain([0, 1]).interpolator(d3.interpolateYlGn);
            const keyColor = d3.scaleSequential().domain([0, 1]).interpolator(d3.interpolatePuRd);
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
                (td) =>
                    `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, pos: ${td.pos_int} of ${td.length})`
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

        const reset = () => {
            console.log("reset!");

            console.log(deckgl, state.viewState);

            deckgl.setProps({
                initialViewState: {
                    target: deckgl.props.viewState,
                },
            });

            deckgl.setProps({
                // this alone doesn't change anything apparently?
                initialViewState: state.viewState,
            });
        };

        watch(
            () => state.matrixData,
            () => {
                drawMatrices();
            }
        );

        watch(
            () => state.attentionData,
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

        context.expose({ reset })

        return {
            ...toRefs(state),
            reset
        };
    },
});
</script>

<style lang="scss" scoped>
$background: #f5f5f7;

#label-wrapper {
    position: absolute;
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
    background: linear-gradient(to right, #f5f5f7, rgba(255, 255, 255, 0));
}

.gradient-edge.right {
    left: unset;
    right: 0;
    background: linear-gradient(to left, #f5f5f7, rgba(255, 255, 255, 0));
}

div.matrix-cell {
    position: absolute;
    border: 1px solid #1d1d1f;
}
</style>
