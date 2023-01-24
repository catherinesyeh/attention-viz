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

import { Deck, OrthographicView, View } from "@deck.gl/core/typed";
// import interface {Deck} from "@deck.gl/core/typed";
import { PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers/typed";
import { toTypeString } from "@vue/shared";

import { computeMatrixProjection } from "@/utils/dataTransform";
import { StaticReadUsage } from "three";
import { head, initial } from "underscore";

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
    minZoom: -1.5,
    maxZoom: 0,
    transitionDuration: 1000,
};

const nullInitialViewZoom: ViewState = {
    target: [0, 0, 0],
    zoom: 2.75,
    minZoom: 2,
    maxZoom: 9,
    transitionDuration: 1000,
};

const matrixCellHeight = 100;
const matrixCellWidth = 100;
const matrixCellMargin = 20;

let canvasWidth: number, canvasHeight: number;
let initialState = nullInitialView;
let initialStateZoom = nullInitialViewZoom;

export default defineComponent({
    components: {},
    setup(props, context) {
        const store = useStore();

        const state = reactive({
            matrixData: computed(() => store.state.matrixData),
            // attentionData: computed(() => store.state.attentionData),
            tokenData: computed(() => store.state.tokenData),
            // points: computed(() => store.state.points),
            viewState: nullInitialView,
            // highlightedPoints: [] as Typing.Point[],
            highlightedTokenIndices: computed(() => store.state.highlightedTokenIndices),
            // moved: false,
            projectionMethod: computed(() => store.state.projectionMethod),
            colorBy: computed(() => store.state.colorBy),
            view: computed(() => store.state.view),
            mode: computed(() => store.state.mode),
            userTheme: computed(() => store.state.userTheme),
            curLayer: computed(() => store.state.layer),
            curHead: computed(() => store.state.head),
            doneLoading: computed(() => store.state.doneLoading),
            showAll: computed(() => store.state.showAll),
            disableLabel: computed(() => store.state.disableLabel),
            zoom: nullInitialView.zoom,
            activePoints: [] as Typing.Point[],
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
                pickable: state.mode == 'single',
                data: points,
                radiusMaxPixels: 5,
                stroked: state.mode == 'single',
                getPosition: (d: Typing.Point) => getPointCoordinate(d),
                getRadius: (d: Typing.Point) => {
                    const defaultSize = 0.4,
                        highlightedSize = 6;
                    if (state.highlightedTokenIndices.length === 0) return defaultSize;
                    return state.highlightedTokenIndices.includes(d.index)
                        ? highlightedSize
                        : defaultSize;
                },
                getLineWidth: (d: Typing.Point) => {
                    return (
                        state.highlightedTokenIndices.includes(d.index)
                            ? 1 / state.zoom
                            : 0
                    ) as any;
                },
                lineWidthMaxPixels: 1,
                getLineColor: (d: Typing.Point) => {
                    const activeColor = state.userTheme != "light-theme" ? [255, 255, 255, 255] : [0, 0, 0, 255],
                        unactiveColor = [255, 255, 255, 0];
                    return (
                        state.highlightedTokenIndices.includes(d.index)
                            ? activeColor
                            : unactiveColor
                    ) as any;
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
                    if (state.mode === 'matrix') {
                        return;
                    }
                    console.log('onClick', info.object);
                    store.commit("setView", 'attn');

                    let pt = info.object as Typing.Point;
                    store.dispatch("setClickedPoint", pt);

                    let tokenIndices = [pt.index];
                    store.commit("setHighlightedTokenIndices", tokenIndices);
                },
                updateTriggers: {
                    getFillColor: [state.colorBy, state.highlightedTokenIndices, state.userTheme],
                    getRadius: state.highlightedTokenIndices,
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
                    let whiteOffset = state.zoom <= 5
                        ? 0.1
                        : state.zoom <= 8
                            ? 0.075 / state.zoom
                            : 0.05 / (1.5 * state.zoom);
                    let offset = (1 / (state.zoom * 2)) + whiteOffset;
                    return [coord[0] + offset, coord[1] + whiteOffset];
                },
                getText: (d: Typing.Point) => d.value,
                getColor: (d: Typing.Point) => {
                    const defaultOpacity = 225;
                    // control how many labels show up
                    var threshold = state.zoom > 8
                        ? 1
                        : state.zoom > 7
                            ? 2
                            : 10 - Math.floor(state.zoom);
                    if (state.highlightedTokenIndices.length === 0)
                        return (state.showAll && !state.disableLabel && (d.index % threshold == 0))
                            ? state.userTheme == "light-theme"
                                ? [255, 255, 255, defaultOpacity]
                                : [0, 0, 0, defaultOpacity]
                            : [255, 255, 255, 0];
                    return state.highlightedTokenIndices.includes(d.index)
                        ? (state.showAll && !state.disableLabel && (d.index % threshold == 0))
                            ? state.userTheme == "light-theme"
                                ? [255, 255, 255, defaultOpacity]
                                : [0, 0, 0, defaultOpacity]
                            : [255, 255, 255, 0]
                        : (state.showAll && !state.disableLabel && (d.index % threshold == 0))
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

        let coveredPixels: number[][] = [];
        const noOverlap = (d: Typing.Point) => {
            let coord = getPointCoordinate(d);
            let numLetters = d.value.length;
            let offset = Math.ceil(1 / (state.zoom * 2));
            if (state.zoom <= 7) {
                offset *= 2;
            }
            let leftX = coord[0] - offset;
            let rightX = coord[0] + offset + numLetters * offset;
            let bottomY = coord[1] - offset;
            let topY = coord[1] + offset;
            // let boundBox = [[leftX, bottomY],
            //         [leftX, topY],
            //         [rightX, topY],
            //         [rightX, bottomY],
            //         ];
            let coordsToAdd = [];
            for (let x = leftX; x <= rightX; x++) {
                for (let y = bottomY; y <= topY; y++) {
                    if (coveredPixels.includes([x, y])) {
                        return false;
                    }
                    coordsToAdd.push([x, y]);
                }
            }
            coveredPixels = [...coveredPixels, ...coordsToAdd];
            return true;
        }
        const toPointLabelLayer = (points: Typing.Point[]) => {
            return new TextLayer({
                id: "point-label-layer",
                data: points, // (state.pointScaleFactor < 0.3) ? points: [],
                pickable: false,
                getPosition: (d: Typing.Point) => {
                    let coord = getPointCoordinate(d);
                    let offset = 1 / (state.zoom * 2);
                    return [coord[0] + offset, coord[1]];
                },
                getText: (d: Typing.Point) => d.value,
                getColor: (d: Typing.Point) => {
                    const defaultOpacity = 225,
                        lightOpacity = 50;
                    // control how many labels show up
                    var threshold = state.zoom > 8
                        ? 1
                        : state.zoom > 7
                            ? 2
                            : 10 - Math.floor(state.zoom);
                    if (state.highlightedTokenIndices.length === 0)
                        return (state.showAll && !state.disableLabel && (d.index % threshold == 0))
                            ? d.type == "query"
                                ? state.userTheme == "light-theme"
                                    ? [43, 91, 25, defaultOpacity]
                                    : [194, 232, 180, defaultOpacity]
                                : state.userTheme == "light-theme"
                                    ? [117, 29, 58, defaultOpacity]
                                    : [240, 179, 199, defaultOpacity]
                            : [255, 255, 255, 0];
                    return state.highlightedTokenIndices.includes(d.index)
                        ? (state.showAll && !state.disableLabel && (d.index % threshold == 0))
                            ? d.type == "query"
                                ? state.userTheme == "light-theme"
                                    ? [43, 91, 25, defaultOpacity]
                                    : [194, 232, 180, defaultOpacity]
                                : state.userTheme == "light-theme"
                                    ? [117, 29, 58, defaultOpacity]
                                    : [240, 179, 199, defaultOpacity]
                            : [255, 255, 255, 0]
                        : (state.showAll && !state.disableLabel && (d.index % threshold == 0))
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
                getSize: state.mode == 'single' ? 24 : 20,
                getAngle: 0,
                getColor: state.userTheme == 'light-theme' ? [0, 0, 0] : [255, 255, 255],
                sizeUnits: state.mode == 'single' ? "pixels" : "common",
                getTextAnchor: "start",
                getAlignmentBaseline: "center",
                updateTriggers: {
                    getColor: state.userTheme
                }
                // onClick: (info, event) => console.log("Clicked:", info, event),
            });
        };

        const toOverlayLayer = (headings: Typing.PlotHead[]) => {
            return new PolygonLayer({
                id: "overlay-layer",
                data: headings,
                pickable: true,
                strokable: false,
                filled: true,
                getPolygon: d => [
                    d.coordinate,
                    [d.coordinate[0], d.coordinate[1] + matrixCellHeight],
                    [d.coordinate[0] + matrixCellWidth, d.coordinate[1] + matrixCellHeight],
                    [d.coordinate[0] + matrixCellWidth, d.coordinate[1]],
                ],
                getFillColor: [255, 255, 255, 0],
                getLineWidth: 0,
                onClick: (info, event) => {
                    let obj = info.object as Typing.PlotHead;
                    zoomToPlot(obj.layer, obj.head);
                },
                updateTriggers: {
                    getPosition: [state.projectionMethod, state.zoom]
                },
            });
        };

        const toTextBlockLayer = (points: Typing.Point[]) => {
            return new PolygonLayer({
                id: "text-block-layer",
                data: points,
                pickable: false,
                strokable: true,
                filled: true,
                getPolygon: d => {
                    let coord = getPointCoordinate(d);
                    let numLetters = d.value.length;
                    let offset = (1 / (state.zoom * 2));
                    if (state.zoom <= 7) {
                        offset *= 2;
                    }
                    return [[coord[0] - offset, coord[1] - offset],
                    [coord[0] - offset, coord[1] + offset],
                    [coord[0] + offset + numLetters * offset, coord[1] + offset],
                    [coord[0] + offset + numLetters * offset, coord[1] - offset],
                    ]
                },
                getFillColor: [0, 0, 0, 255],
                getLineWidth: 0.01,
                getLineColor: [255, 255, 255, 255]
            });
        };
        const toLayers = () => {
            let { points, headings } = shallowData.value;
            if (state.curHead !== "" && state.curLayer !== "") { // single mode
                // filter only points in this layer
                const pointsPerHead = points.length / headings.length; // number points per attention head
                let headIndex = headings.findIndex((d) => d.layer == state.curLayer && d.head == state.curHead);
                let startInd = pointsPerHead * headIndex;
                let endInd = startInd + pointsPerHead;

                const layer_points = points.slice(startInd, endInd);
                state.activePoints = layer_points;
                const layer_headings = headings[headIndex];
                // coveredPixels = [];
                // let results = points.map(x => noOverlap(x));
                // console.log(results);
                return [toPointLayer(layer_points), toPlotHeadLayer([layer_headings]), toLabelOutlineLayer(layer_points), toPointLabelLayer(layer_points)];
            }
            // else: return matrix
            return [toPointLayer(points), toPlotHeadLayer(headings), toOverlayLayer(headings)];
        };

        /**
         * The main function for drawing the scatter matrices
         */
        const initMatrices = () => {
            const { points, headings, range } = shallowData.value;
            console.log("initMatrices", points, headings);
            if (!points || !points.length) return;

            // put init view state in the centre
            canvasWidth = range.x[0] + range.x[1];
            canvasHeight = range.y[0] + range.y[1];
            initialState = {
                target: [canvasWidth / 2, canvasHeight / 2, 0],
                zoom: -1,
                minZoom: -1.5,
                maxZoom: 0,
                transitionDuration: 1000,
            };
            state.viewState = state.mode === 'matrix' ? initialState : initialStateZoom;

            deckgl = new Deck({
                canvas: "matrix-canvas",
                controller: true,
                views: new OrthographicView({
                    flipY: false,
                }),
                initialViewState: state.viewState,
                layers: toLayers(),
                getTooltip: ({ object }) => {
                    if (state.mode == 'matrix') {
                        return null;
                    }
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
                    if (state.mode == 'matrix') {
                        return;
                    }
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
            // console.log(coveredPixels);
            store.commit("updateRenderState", false);
        };

        const handleRequest = (param: any) => {
            const zoom = param.viewState.zoom;
            state.zoom = zoom;

            if (zoom >= 5 && state.disableLabel) {
                store.commit("setDisableLabel", false);
            } else if (zoom < 5 && !state.disableLabel) {
                store.commit("setDisableLabel", true);
                // store.commit("setShowAll", false);
            }
        };

        /**
         * Reset the view state to matrix mode
         */
        const reset = () => {
            store.commit("setLayer", "");
            store.commit("setHead", "");
            store.commit("setMode", "matrix");
            state.activePoints = [];

            if (state.view == 'attn') {
                store.commit("setHighlightedTokenIndices", []);
            }

            state.viewState = initialState;
            // deckgl.setProps({
            //     initialViewState: nullInitialView,
            // });
            deckgl.setProps({
                // this alone doesn't change anything apparently?
                initialViewState: state.viewState,
            });
        };

        /* 
         * Reset zoom only
         */
        const resetZoom = () => {
            if (state.mode == "matrix") {
                deckgl.setProps({
                    initialViewState: nullInitialView,
                });
            } else {
                deckgl.setProps({
                    initialViewState: nullInitialViewZoom,
                });
            }
            deckgl.setProps({
                initialViewState: state.viewState,
            });
        }

        const computedProjection = () => {
            let { matrixData, tokenData } = state;
            if (matrixData.length && tokenData.length) {
                let projData = computeMatrixProjection(matrixData, tokenData);
                shallowData.value = projData;
            }
        };

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

        const zoomToPlot = (layer: number, head: number) => {
            // zoom to plot
            if (state.mode !== "single") {
                store.commit("setMode", "single");
            }

            const x_center = head * (matrixCellWidth + matrixCellMargin) + 0.5 * matrixCellWidth;
            const y_center =
                -layer * (matrixCellHeight + matrixCellMargin) + 0.5 * matrixCellHeight;
            initialStateZoom = {
                target: [x_center, y_center, 0],
                zoom: 2.75,
                minZoom: 2,
                maxZoom: 9,
                transitionDuration: 1000,
            };
            state.viewState = initialStateZoom;
            // deckgl.setProps({
            //     initialViewState: nullInitialViewZoom,
            // });
            deckgl.setProps({
                initialViewState: state.viewState,
            });

            console.log("Layer " + layer + ", Head " + head);
            store.commit("setLayer", layer);
            store.commit("setHead", head);
        };

        onMounted(() => {
            console.log("onMounted");
            computedProjection();
        });

        watch([() => state.matrixData, () => state.tokenData],
            () => {
                if (state.doneLoading) {
                    computedProjection();
                }
            }
        );

        watch([shallowData], () => {
            initMatrices();
        });

        // re-render the visualization whenever any of the following changes
        watch(
            [
                () => state.highlightedTokenIndices,
                () => state.projectionMethod,
                () => state.colorBy,
                () => state.userTheme,
                () => state.curHead,
                () => state.curLayer,
                () => state.zoom,
                () => state.showAll
            ],
            () => {
                deckgl.setProps({ layers: [...toLayers()] });
            }
        );

        watch([() => state.doneLoading, () => state.curLayer, () => state.curHead],
            () => {
                if (state.doneLoading && state.activePoints.length != 0 && state.view === "attn") {
                    // fix attention view
                    let ind = state.highlightedTokenIndices[0];
                    let pt = state.activePoints[ind];
                    store.dispatch("setClickedPoint", pt);
                }
            }
        )

        watch(() => state.highlightedTokenIndices,
            () => {
                if (state.highlightedTokenIndices.length == 0) {
                    store.commit("setView", "none");
                }
            })

        // expose functions to the parent
        context.expose({
            reset,
            resetZoom,
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
