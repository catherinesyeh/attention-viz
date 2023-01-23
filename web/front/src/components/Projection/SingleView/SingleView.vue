<!-- Vue components: https://vuejs.org/guide/essentials/component-basics.html -->
<template>
    <canvas id="matrix-canvas" />
</template>

<script lang="ts">
import {
    onMounted,
    computed,
    reactive,
    toRefs,
    h,
    watch,
    defineComponent,
    PropType,
    shallowRef,
} from "vue";
import * as _ from "underscore";
import * as d3 from "d3";
import { useStore } from "@/store/index";
import { ScatterGL, Point2D } from "scatter-gl";

import { Typing } from "@/utils/typing";

import { Deck, OrthographicView } from "@deck.gl/core/typed";
// import interface {Deck} from "@deck.gl/core/typed";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers/typed";
import { toTypeString } from "@vue/shared";

import { computeMatrixProjection } from "@/utils/dataTransform";
import { StaticReadUsage } from "three";

interface ViewState {
    target: number[];
    zoom: number;
    minZoom: number;
    maxZoom: number;
    transitionDuration: number;
}
const nullInitialView: ViewState = {
    target: [0, 0, 0],
    zoom: -1,
    minZoom: -2,
    maxZoom: 9,
    transitionDuration: 1000,
};

const matrixCellHeight = 100;
const matrixCellWidth = 100;
const matrixCellMargin = 20;

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
            // attentionData: computed(() => store.state.attentionData),
            tokenData: computed(() => store.state.tokenData),
            // points: computed(() => store.state.points),
            matrixCellHeight: matrixCellHeight,
            matrixCellWidth: matrixCellWidth,
            matrixCellMargin: matrixCellMargin,
            viewState: nullInitialView,
            // highlightedPoints: [] as Typing.Point[],
            highlightedTokenIndices: computed(() => store.state.highlightedTokenIndices),
            zoom: nullInitialView.zoom,
            pointScaleFactor: 1,
            moved: false,
            projectionMethod: computed(() => store.state.projectionMethod),
            colorBy: computed(() => store.state.colorBy),
            view: computed(() => store.state.view),
            userTheme: computed(() => store.state.userTheme),
            showAll: computed(() => store.state.showAll)
        });

        var shallowData = shallowRef({
            points: [],
            headings: [],
            range: {
                x: [0, 0],
                y: [0, 0],
            },
        } as Typing.Projection);

        var deckgl = {} as Deck;

        const getPointCoordinate = (d: Typing.Point) => {
            switch (state.projectionMethod) {
                case "tsne":
                    return d.coordinate.tsne;
                case "umap":
                    return d.coordinate.umap;
                default:
                    throw Error("Invalid projection method!");
            }
        };

        const toPointLayer = (points: Typing.Point[]) => {
            return new ScatterplotLayer({
                pickable: true,
                data: points,
                radiusMaxPixels: 5,
                getPosition: (d: Typing.Point) => getPointCoordinate(d),
                getRadius: (d: Typing.Point) => {
                    const defaultSize = 0.4 * state.pointScaleFactor,
                        highlightedSize = 6 * state.pointScaleFactor;
                    if (state.highlightedTokenIndices.length === 0) return defaultSize;
                    return state.highlightedTokenIndices.includes(d.index)
                        ? highlightedSize
                        : defaultSize;
                },
                getFillColor: (d: Typing.Point) => {
                    const getColor = (d: Typing.Point) => {
                        switch (state.colorBy) {
                            case 'type':
                                return d.color.type
                            case 'position':
                                return d.color.position
                            case 'categorical':
                                return d.color.categorical
                            case 'norm':
                                return d.color.norm
                            default:
                                throw Error('invalid color channel')
                        }
                    }
                    const defaultColor = [...getColor(d), 175],
                        highlightColorQuery = [84, 148, 61, 175],
                        highlightColorQueryDark = [157, 216, 135, 175],
                        highlightColorKey = [193, 91, 125, 175],
                        highlightColorKeyDark = [234, 138, 170, 175],
                        unactiveColor = [...getColor(d), 25];
                    if (!state.highlightedTokenIndices.length) return defaultColor;
                    return (
                        state.highlightedTokenIndices.includes(d.index)
                            ? d.type == "query"
                                ? state.userTheme == "light-theme"
                                    ? highlightColorQuery
                                    : highlightColorQueryDark
                                : state.userTheme == "light-theme"
                                    ? highlightColorKey
                                    : highlightColorKeyDark
                            : unactiveColor
                    ) as any;
                },
                onClick: (info, event) => {
                    // console.log('onClick', info.object);
                    store.commit("setView", 'attn');

                    let pt = info.object as Typing.Point;
                    store.dispatch("setClickedPoint", pt);

                    let tokenIndices = [pt.index];
                    store.commit("setHighlightedTokenIndices", tokenIndices);
                },
                updateTriggers: {
                    getFillColor: [state.colorBy, state.highlightedTokenIndices, state.userTheme],
                    getRadius: [state.pointScaleFactor, state.highlightedTokenIndices],
                    getPosition: state.projectionMethod,
                },
            });
        };
        const toLabelOutlineLayer = (points: Typing.Point[]) => {
            return new TextLayer({
                id: "label-outline-layer",
                data: points,
                pickable: false,
                getPosition: (d: Typing.Point) => {
                    let coord = getPointCoordinate(d);
                    if (state.zoom <= 3) return [0, 0];
                    let whiteOffset = state.zoom <= 5
                        ? 0.05
                        : state.zoom <= 8
                            ? 0.05 / state.zoom
                            : 0.05 / (1.5 * state.zoom);
                    let offset = (1 / (state.zoom * 2)) + whiteOffset;
                    return [coord[0] + offset, coord[1] + whiteOffset];
                },
                getText: (d: Typing.Point) => d.value,
                getColor: (d: Typing.Point) => {
                    const defaultOpacity = 225;
                    var threshold = state.zoom; // control how many labels show up
                    if (state.zoom > 5) {
                        threshold *= (state.zoom - 3);
                    }
                    if (state.highlightedTokenIndices.length === 0)
                        return state.zoom > 3 && (state.showAll || (d.index % Math.floor(150 / threshold) == 0))
                            ? state.userTheme == "light-theme"
                                ? [255, 255, 255, defaultOpacity]
                                : [0, 0, 0, defaultOpacity]
                            : [255, 255, 255, 0];
                    return state.highlightedTokenIndices.includes(d.index)
                        ? state.zoom > 3 && (state.showAll || (d.index % Math.floor(150 / threshold) == 0))
                            ? state.userTheme == "light-theme"
                                ? [255, 255, 255, defaultOpacity]
                                : [0, 0, 0, defaultOpacity]
                            : [255, 255, 255, 0]
                        : state.zoom > 3 && (state.showAll || (d.index % Math.floor(150 / threshold) == 0))
                            ? state.userTheme == "light-theme"
                                ? [255, 255, 255, defaultOpacity]
                                : [0, 0, 0, defaultOpacity]
                            : [255, 255, 255, 0];
                },
                getSize: 12,
                getAngle: 0,
                getTextAnchor: "start",
                getAlignmentBaseline: "center",
                updateTriggers: {
                    getColor: [state.zoom, state.highlightedTokenIndices, state.userTheme, state.showAll],
                    getPosition: [state.projectionMethod, state.zoom]
                },
                // onClick: (info, event) => console.log("Clicked:", info, event),
            });
        };
        const toPointLabelLayer = (points: Typing.Point[]) => {
            return new TextLayer({
                id: "point-label-layer",
                data: points, // (state.pointScaleFactor < 0.3) ? points: [],
                pickable: false,
                getPosition: (d: Typing.Point) => {
                    let coord = getPointCoordinate(d);
                    if (state.zoom <= 3) return [0, 0];
                    let offset = 1 / (state.zoom * 2);
                    return [coord[0] + offset, coord[1]];
                },
                getText: (d: Typing.Point) => d.value,
                getColor: (d: Typing.Point) => {
                    const defaultOpacity = 225,
                        lightOpacity = 50;
                    var threshold = state.zoom; // control how many labels show up
                    if (state.zoom > 5) {
                        threshold *= (state.zoom - 3);
                    }
                    if (state.highlightedTokenIndices.length === 0)
                        return state.zoom > 3 && (state.showAll || (d.index % Math.floor(150 / threshold) == 0))
                            ? d.type == "query"
                                ? state.userTheme == "light-theme"
                                    ? [43, 91, 25, defaultOpacity]
                                    : [194, 232, 180, defaultOpacity]
                                : state.userTheme == "light-theme"
                                    ? [117, 29, 58, defaultOpacity]
                                    : [240, 179, 199, defaultOpacity]
                            : [255, 255, 255, 0];
                    return state.highlightedTokenIndices.includes(d.index)
                        ? state.zoom > 3 && (state.showAll || (d.index % Math.floor(150 / threshold) == 0))
                            ? d.type == "query"
                                ? state.userTheme == "light-theme"
                                    ? [43, 91, 25, defaultOpacity]
                                    : [194, 232, 180, defaultOpacity]
                                : state.userTheme == "light-theme"
                                    ? [117, 29, 58, defaultOpacity]
                                    : [240, 179, 199, defaultOpacity]
                            : [255, 255, 255, 0]
                        : state.zoom > 3 && (state.showAll || (d.index % Math.floor(150 / threshold) == 0))
                            ? d.type == "query"
                                ? state.userTheme == "light-theme"
                                    ? [43, 91, 25, lightOpacity]
                                    : [194, 232, 180, lightOpacity]
                                : state.userTheme == "light-theme"
                                    ? [117, 29, 58, lightOpacity]
                                    : [240, 179, 199, lightOpacity]
                            : [255, 255, 255, 0];
                },
                getSize: 12,
                getAngle: 0,
                getTextAnchor: "start",
                getAlignmentBaseline: "center",
                updateTriggers: {
                    getColor: [state.zoom, state.highlightedTokenIndices, state.userTheme, state.showAll],
                    getPosition: [state.projectionMethod, state.zoom]
                },
                // onClick: (info, event) => console.log("Clicked:", info, event),
            });
        };

        const toPlotHeadLayer = (headings: Typing.PlotHead[]) => {
            return new TextLayer({
                id: "text-layer",
                data: headings,
                pickable: false,
                getPosition: (d: Typing.PlotHead) => d.coordinate,
                getText: (d: Typing.PlotHead) => d.title,
                getSize: state.zoom >= 1 ? 24 : 20,
                getAngle: 0,
                getColor: state.userTheme == 'light-theme' ? [0, 0, 0] : [255, 255, 255],
                sizeUnits: state.zoom >= 1 ? "pixels" : "common",
                getTextAnchor: "start",
                getAlignmentBaseline: "center",
                updateTriggers: {
                    getSize: state.zoom,
                    sizeUnits: state.zoom,
                    getColor: state.userTheme
                }
                // onClick: (info, event) => console.log("Clicked:", info, event),
            });
        };
        const toLayers = () => {
            let { points, headings } = shallowData.value;
            return [toPointLayer(points), toPlotHeadLayer(headings), toLabelOutlineLayer(points), toPointLabelLayer(points)];
        };

        /**
         * The main function for drawing the scatter matrices
         */
        const initMatrices = () => {
            const { points, headings, range } = shallowData.value;
            console.log("initMatrices", points, headings);
            if (!points || !points.length) return;

            // put init view state in the centre
            const canvasWidth = range.x[0] + range.x[1];
            const canvasHeight = range.y[0] + range.y[1];
            state.viewState = {
                target: [canvasWidth / 2, canvasHeight / 2, 0],
                zoom: -1,
                minZoom: -2,
                maxZoom: 9,
                transitionDuration: 1000,
            };

            deckgl = new Deck({
                canvas: "matrix-canvas",
                controller: true,
                views: new OrthographicView({
                    flipY: false,
                }),
                initialViewState: state.viewState,
                layers: toLayers(),
                getTooltip: ({ object }) => {
                    const getMsg = (d: Typing.Point) => {
                        switch (state.colorBy) {
                            case 'type':
                            case 'position':
                                return d.msg.position
                            case 'categorical':
                                return d.msg.categorical
                            case 'norm':
                                return d.msg.norm
                            default:
                                throw Error('invalid msg channel')
                        }
                    }
                    return object && {
                        html: getMsg(object),
                        style: {
                            color: "#fff",
                            background: "#222"
                        },
                    }
                },
                onViewStateChange: (param) => {
                    let timeout: any;
                    if (param.interactionState.inTransition) {
                        clearInterval(timeout);
                        timeout = setTimeout(function () {
                            handleRequest(param);
                        }, 100);
                    }
                },
            });

            // setTimeout needed here?
            store.commit("updateRenderState", false);
        };

        const handleRequest = (param: any) => {
            const zoom = param.viewState.zoom;
            const old_zoom = state.zoom;
            state.zoom = zoom;

            if (!state.moved) { // adjust after first user movement
                state.moved = true;
            }

            // if ((old_zoom < 6 && zoom < 6) || (old_zoom >= 6 && zoom >= 6)) {
            //     // only run rest of code zoom crossed threshold
            //     return;
            // }

            if (old_zoom < 6 && zoom >= 6) {
                state.pointScaleFactor = 0.15;
                store.commit("setDisableLabel", false);
                // } else if (zoom > 4.5) {
                //     state.pointScaleFactor = 0.2;
                // } else if (zoom > 3) {
                //     state.pointScaleFactor = 0.5;
            } else if (old_zoom >= 6 && zoom < 6) {
                state.pointScaleFactor = 1;
                store.commit("setShowAll", false);
                store.commit("setDisableLabel", true);
            }
        };

        /**
         * Reset the view state
         */
        const reset = () => {
            if (state.moved) {
                deckgl.setProps({
                    initialViewState: nullInitialView,
                });

                deckgl.setProps({
                    // this alone doesn't change anything apparently?
                    initialViewState: state.viewState,
                });
            }
            state.pointScaleFactor = 1;
        };

        const computedProjection = () => {
            let { matrixData, tokenData } = state;
            if (matrixData.length && tokenData.length) {
                let projData = computeMatrixProjection(matrixData, tokenData);
                shallowData.value = projData;
            }
        };

        watch([() => state.matrixData, () => state.tokenData], () => computedProjection());

        watch([shallowData], () => {
            initMatrices();
        });

        // re-render the visualization whenever any of the following changes
        watch(
            [
                () => state.highlightedTokenIndices,
                () => state.pointScaleFactor,
                () => state.zoom,
                () => state.projectionMethod,
                () => state.colorBy,
                () => state.userTheme,
                () => state.showAll
            ],
            () => {
                deckgl.setProps({ layers: [...toLayers()] });
            }
        );

        onMounted(() => {
            console.log("onMounted");
            computedProjection();
        });

        /**
         * Search and highlight tokens
         * @param str
         */
        const onSearch = (str: string) => {
            let tokenIndices = state.tokenData
                .map((x, idx) => (x.value === str ? idx : undefined))
                .filter((x) => x) as number[];

            // let tokenPoints = shallowData.value.points.filter((x) =>
            //     tokenIndices.includes(x.index)
            // );
            store.commit("setHighlightedTokenIndices", tokenIndices);
            return tokenIndices.length;
        };

        const printViewport = () => {
            console.error("viewport", deckgl.getViewports());
        };

        const zoomToPlot = (layer: string, head: number) => {
            // zoom to plot
            console.log("Layer " + layer + ", Head " + head);
            const x_center = head * (matrixCellWidth + matrixCellMargin) + 0.5 * matrixCellWidth;
            const y_center =
                -layer * (matrixCellHeight + matrixCellMargin) + 0.5 * matrixCellHeight;
            const newViewState = {
                target: [x_center, y_center, 0],
                zoom: 2.75,
                minZoom: -2,
                maxZoom: 9,
                transitionDuration: 1000,
            };

            deckgl.setProps({
                initialViewState: state.viewState
            });
            deckgl.setProps({
                initialViewState: newViewState,
            });
        };

        watch(() => state.highlightedTokenIndices,
            () => {
                if (state.highlightedTokenIndices.length == 0) {
                    store.commit("setView", "none");
                }
            })

        // expose functions to the parent
        context.expose({
            reset,
            onSearch,
            printViewport,
            zoomToPlot,
        });

        return {
            ...toRefs(state),
        };
    },
});
</script>

<style lang="scss" scoped>
$background: #f5f5f7;

#matrix-canvas {
    transition: 0.5s;
}

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
