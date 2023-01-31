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

import { Deck, OrbitView, OrthographicView, View } from "@deck.gl/core/typed";
// import interface {Deck} from "@deck.gl/core/typed";
import { PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers/typed";
import { toTypeString } from "@vue/shared";

import { computeMatrixProjection } from "@/utils/dataTransform";
import { StaticReadUsage } from "three";
import { head, initial } from "underscore";
import { validate } from "@babel/types";
import RBush from 'rbush';
import { dragDisable } from "d3";

// constants
const matrixCellHeight = 100;
const matrixCellWidth = 100;
const matrixCellMargin = 20;

let canvasWidth: number, canvasHeight: number;
let timeout: any;
let zoomThreshold = 2.5;

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
    maxZoom: 9,
    transitionDuration: 1000,
};

const nullInitialViewZoom: ViewState = {
    target: [0, 0, 0],
    zoom: zoomThreshold,
    minZoom: -1.5,
    maxZoom: 9,
    transitionDuration: 1000,
};

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
            // disableLabel: computed(() => store.state.disableLabel),
            zoom: nullInitialView.zoom,
            activePoints: [] as Typing.Point[],
            dimension: computed(() => store.state.dimension),
            cursorX: 0,
            cursorY: 0,
            transitionInProgress: false
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

        // helper functions for layers
        const getPointCoordinate = (d: Typing.Point) => {
            switch (state.projectionMethod) {
                case "tsne":
                    return state.dimension === "2D" ? d.coordinate.tsne : d.coordinate.tsne_3d;
                case "umap":
                    return state.dimension === "2D" ? d.coordinate.umap : d.coordinate.umap_3d;
                default:
                    throw Error("Invalid projection method!");
            }
        };

        const tree = new RBush(); // fast label overlap detection
        const sizeMeasurer = (label: string, fontSize: number) => {
            let threshold =
                state.zoom <= 5
                    ? 2
                    : state.zoom <= 7
                        ? 2.25
                        : state.zoom <= 8.5
                            ? 2.5
                            : 4;
            if (state.zoom > 3.5 && state.zoom <= 8.5 && state.dimension === "3D") {
                threshold *= 1.5;
            }
            const size = {
                width: fontSize * (1 / Math.pow(threshold, state.zoom)) * label.length,
                height: fontSize
            };
            return size;
        }

        // LAYERS
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
                            case 'punctuation':
                                return d.color.punctuation
                            case 'length':
                                return d.color.length
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
                    getPosition: [state.projectionMethod, state.dimension]
                },
            });
        };
        const toLabelOutlineLayer = (points: Typing.Point[], visiblePoints: boolean[]) => {
            return new TextLayer({
                id: "label-outline-layer",
                data: points,
                pickable: false,
                getPosition: (d: Typing.Point) => {
                    if (!state.showAll || !visiblePoints[d.index]) {
                        return state.dimension === "2D" ? [0, 0] : [0, 0, 0];
                    }
                    let coord = getPointCoordinate(d);
                    let whiteOffset = state.zoom <= 3.5
                        ? 0.1
                        : state.zoom <= 5.5
                            ? 0.1 / state.zoom
                            : state.zoom <= 8
                                ? 0.08 / state.zoom
                                : 0.05 / (1.5 * state.zoom);
                    let offset = 1 / Math.pow(1.5, state.zoom) + whiteOffset;
                    return [coord[0] + offset, coord[1] + whiteOffset];
                },
                getText: (d: Typing.Point) => d.value,
                getColor: (d: Typing.Point) => {
                    if (!state.showAll || !visiblePoints[d.index]) {
                        return [255, 255, 255, 0];
                    }

                    const defaultOpacity = 225;
                    return state.userTheme == "light-theme"
                        ? [255, 255, 255, defaultOpacity]
                        : [0, 0, 0, defaultOpacity];
                },
                getSize: 12,
                getAngle: 0,
                getTextAnchor: "start",
                getAlignmentBaseline: "center",
                updateTriggers: {
                    getColor: [state.zoom, state.highlightedTokenIndices, state.userTheme, state.showAll],
                    getPosition: [state.projectionMethod, state.zoom]
                },
            });
        };

        const toPointLabelLayer = (points: Typing.Point[], visiblePoints: boolean[]) => {
            return new TextLayer({
                id: "point-label-layer",
                data: points, // (state.pointScaleFactor < 0.3) ? points: [],
                pickable: false,
                getPosition: (d: Typing.Point) => {
                    if (!state.showAll || !visiblePoints[d.index]) {
                        return state.dimension === "2D" ? [0, 0] : [0, 0, 0];
                    }
                    let coord = getPointCoordinate(d);
                    let offset = 1 / Math.pow(1.5, state.zoom);
                    return coord.length == 2
                        ? [coord[0] + offset, coord[1]]
                        : [coord[0] + offset, coord[1], coord[2] + offset];
                },
                getText: (d: Typing.Point) => d.value,
                getColor: (d: Typing.Point) => {
                    if (!state.showAll || !visiblePoints[d.index]) {
                        return [255, 255, 255, 0];
                    }

                    const defaultOpacity = 225,
                        lightOpacity = 50;
                    if (state.highlightedTokenIndices.length === 0)
                        return d.type == "query"
                            ? state.userTheme == "light-theme"
                                ? [43, 91, 25, defaultOpacity]
                                : [194, 232, 180, defaultOpacity]
                            : state.userTheme == "light-theme"
                                ? [117, 29, 58, defaultOpacity]
                                : [240, 179, 199, defaultOpacity]
                    return state.highlightedTokenIndices.includes(d.index)
                        ? d.type == "query"
                            ? state.userTheme == "light-theme"
                                ? [43, 91, 25, defaultOpacity]
                                : [194, 232, 180, defaultOpacity]
                            : state.userTheme == "light-theme"
                                ? [117, 29, 58, defaultOpacity]
                                : [240, 179, 199, defaultOpacity]
                        : d.type == "query"
                            ? state.userTheme == "light-theme"
                                ? [43, 91, 25, lightOpacity]
                                : [194, 232, 180, lightOpacity]
                            : state.userTheme == "light-theme"
                                ? [117, 29, 58, lightOpacity]
                                : [240, 179, 199, lightOpacity];
                },
                getSize: 12,
                getAngle: 0,
                getTextAnchor: "start",
                getAlignmentBaseline: "center",
                updateTriggers: {
                    getColor: [state.zoom, state.highlightedTokenIndices, state.userTheme, state.showAll, state.dimension],
                    getPosition: [state.projectionMethod, state.zoom]
                },
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
                sizeMaxPixels: 24,
                getAngle: 0,
                getColor: state.userTheme == 'light-theme' ? [0, 0, 0] : [255, 255, 255],
                sizeUnits: state.mode == 'single' ? "pixels" : "common",
                getTextAnchor: "start",
                getAlignmentBaseline: "center",
                updateTriggers: {
                    getColor: state.userTheme
                }
            });
        };

        const toOverlayLayer = (headings: Typing.PlotHead[]) => {
            return new PolygonLayer({
                id: "overlay-layer",
                data: headings,
                pickable: true,
                strokable: false,
                filled: true,
                extruded: state.dimension == "3D",
                getPolygon: d => [
                    d.coordinate,
                    [d.coordinate[0], d.coordinate[1] + matrixCellHeight],
                    [d.coordinate[0] + matrixCellWidth, d.coordinate[1] + matrixCellHeight],
                    [d.coordinate[0] + matrixCellWidth, d.coordinate[1]],
                ],
                getFillColor: [255, 255, 255, 0],
                getElevation: 100,
                getLineWidth: 0,
                onClick: (info, event) => {
                    let obj = info.object as Typing.PlotHead;
                    zoomToPlot(obj.layer, obj.head, true);
                },
                updateTriggers: {
                    getPosition: [state.projectionMethod, state.zoom]
                },
            });
        };

        const makeTree = (d: Typing.Point) => {
            let coord = getPointCoordinate(d);
            let labelSize = sizeMeasurer(d.value, 12);
            let new_coord = {
                minX: coord[0] - 0.5 * labelSize.width,
                minY: coord[1] - 0.5 * labelSize.width,
                maxX: coord[0] + 0.5 * labelSize.width,
                maxY: coord[1] + 0.5 * labelSize.height
            }
            const overlap = tree.collides(new_coord);
            if (overlap) {
                // return [255, 255, 255, 0];
                return false;
            }
            tree.insert(new_coord);
            return true;
        }

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

                tree.clear(); // reset RBush on change
                const visiblePoints = layer_points.map((v) => makeTree(v));

                if (state.dimension == "2D") {
                    return [toPointLayer(layer_points), toPlotHeadLayer([layer_headings]), toLabelOutlineLayer(layer_points, visiblePoints), toPointLabelLayer(layer_points, visiblePoints)];
                }

                // no white outline around labels in 3d view
                return [toPointLayer(layer_points), toPlotHeadLayer([layer_headings]), toPointLabelLayer(layer_points, visiblePoints)];
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
                maxZoom: 9,
                transitionDuration: 1000,
            };
            state.viewState = state.mode === 'matrix' ? initialState : initialStateZoom;

            deckgl = new Deck({
                canvas: "matrix-canvas",
                controller: true,
                views: state.dimension == "3D" ?
                    new OrbitView({
                        orbitAxis: 'Y'
                    })
                    : new OrthographicView({
                        flipY: false,
                    }),
                initialViewState: state.viewState,
                layers: toLayers(),
                getTooltip: ({ object }) => {
                    const getMsg = (d: Typing.Point) => {
                        switch (state.colorBy) {
                            case 'type':
                            case 'position':
                            case 'punctuation':
                                return d.msg.position
                            case 'categorical':
                                return d.msg.categorical
                            case 'norm':
                                return d.msg.norm
                            case 'length':
                                return d.msg.length
                            default:
                                throw Error('invalid msg channel')
                        }
                    }
                    return object && {
                        html: state.mode === 'matrix' ? object.title : getMsg(object),
                        style: {
                            color: "#fff",
                            background: "#222"
                        },
                    }
                },
                onViewStateChange: (param) => {
                    // if (state.mode == 'matrix') {
                    //     return;
                    // }
                    if (param.interactionState.inTransition) {
                        clearTimeout(timeout);
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

        // const toggleDisableLabel = (zoom: number) => {
        //     if (state.dimension == "2D") {
        //         if (zoom >= 5 && state.disableLabel) {
        //             store.commit("setDisableLabel", false);
        //         } else if (zoom < 5 && !state.disableLabel) {
        //             store.commit("setDisableLabel", true);
        //             // store.commit("setShowAll", false);
        //         }
        //     } else {
        //         if (zoom >= 3 && state.disableLabel) {
        //             store.commit("setDisableLabel", false);
        //         } else if (zoom < 3 && !state.disableLabel) {
        //             store.commit("setDisableLabel", true);
        //             // store.commit("setShowAll", false);
        //         }
        //     }
        // }

        onwheel = (event: WheelEvent) => {
            if (state.transitionInProgress) {
                event.preventDefault;
            }

            if (state.mode === "matrix") {
                // only run if matrix mode
                state.cursorX = event.offsetX;
                state.cursorY = event.offsetY;
            }
        }

        const handleRequest = (param: any) => {
            const zoom = param.viewState.zoom;
            const old_zoom = state.zoom;
            state.zoom = zoom;
            let switchThreshold = zoomThreshold;

            if (state.dimension === "3D") {
                switchThreshold = 1.5;
            }

            state.transitionInProgress = true;
            if (old_zoom < switchThreshold && zoom >= switchThreshold) {
                // if matrix mode, zoom to closest graph on zoom
                const closest = deckgl.pickObject({
                    x: state.cursorX,
                    y: state.cursorY,
                    radius: 100,
                    layerIds: ['overlay-layer'],
                    unproject3D: state.dimension === "3D"
                });
                if (closest) {
                    let obj = closest.object as Typing.PlotHead;
                    zoomToPlot(obj.layer, obj.head, false);
                }
            } else if (old_zoom >= switchThreshold && zoom < switchThreshold) {
                // if single mode
                reset(false);
            }

            state.transitionInProgress = false;
        };

        /**
         * Reset the view state to matrix mode
         */
        const reset = (clicked: boolean) => {
            store.commit("setMode", "matrix");
            store.commit("setLayer", "");
            store.commit("setHead", "");
            state.activePoints = [];

            if (state.view == 'attn') {
                store.commit("setHighlightedTokenIndices", []);
            }

            state.viewState = initialState;
            // deckgl.setProps({
            //     initialViewState: nullInitialView,
            // });

            if (clicked) {
                deckgl.setProps({
                    // this alone doesn't change anything apparently?
                    initialViewState: state.viewState,
                });
            }
        };

        /* 
         * Reset zoom only
         */
        const resetZoom = () => {
            const curTarget = state.viewState.target;
            const center = deckgl.getViewports()[0].center;
            const zoom = deckgl.getViewports()[0].zoom;
            if (curTarget[0] == center[0] && curTarget[1] == center[1] && state.zoom == zoom && state.dimension === "2D") {
                return; // no reset needed
            }
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

        const zoomToPlot = (layer: number, head: number, clicked: boolean) => {
            // zoom to plot
            if (state.mode !== "single") {
                store.commit("setMode", "single");
            }

            const x_center = head * (matrixCellWidth + matrixCellMargin) + 0.5 * matrixCellWidth;
            const y_center =
                -layer * (matrixCellHeight + matrixCellMargin) + 0.5 * matrixCellHeight;
            initialStateZoom = {
                target: [x_center, y_center, 0],
                zoom: zoomThreshold,
                minZoom: -1.5,
                maxZoom: 9,
                transitionDuration: 1000,
            };
            state.viewState = initialStateZoom;
            // deckgl.setProps({
            //     initialViewState: nullInitialViewZoom,
            // });

            if (clicked) {
                deckgl.setProps({
                    initialViewState: state.viewState,
                });
            }

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

        watch(() => state.dimension, () => {
            resetZoom();

            deckgl.setProps({
                views: state.dimension == "3D" ?
                    new OrbitView({
                        orbitAxis: 'Y'
                    })
                    : new OrthographicView({
                        flipY: false,
                    }),
            });

            // if (state.mode == "single") {
            //     state.zoom = deckgl.getViewports()[0].zoom;
            //     // toggleDisableLabel(state.zoom);
            // }

            deckgl.setProps({ layers: [...toLayers()] });
        })

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
#matrix-canvas {
    transition: 0.5s;
}
</style>
