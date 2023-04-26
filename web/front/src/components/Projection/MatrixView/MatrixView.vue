<!-- Vue components: https://vuejs.org/guide/essentials/component-basics.html -->
<template>
    <div>
        <Transition>
            <Circle v-show="attentionLoading || transitionInProgress" />
        </Transition>
        <canvas id="matrix-canvas" />
    </div>
</template>

<script lang="ts">
import {
    onMounted,
    computed,
    reactive,
    toRefs,
    watch,
    defineComponent,
    shallowRef,
} from "vue";
import * as _ from "underscore";
import { useStore } from "@/store/index";
import { IconLayer } from '@deck.gl/layers/typed';

import { Typing } from "@/utils/typing";

import { Deck, OrbitView, OrthographicView, View } from "@deck.gl/core/typed";
import { PolygonLayer, ScatterplotLayer, TextLayer, LineLayer } from "@deck.gl/layers/typed";

import { computeMatrixProjection } from "@/utils/dataTransform";
import { computeVitMatrixProjection } from "@/utils/vitDataTransform";
import Circle from './Circle.vue';
import RBush from 'rbush';

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

const defaultOpacity = 225,
    lightOpacity = 50;

export default defineComponent({
    components: { Circle },
    setup(props, context) {
        const store = useStore();

        const state = reactive({
            matrixData: computed(() => store.state.matrixData),
            tokenData: computed(() => store.state.tokenData),
            viewState: nullInitialView,
            highlightedTokenIndices: computed(() => store.state.highlightedTokenIndices),
            attentionByToken: computed(() => store.state.attentionByToken),
            curAttn: computed(() => store.state.curAttn),
            projectionMethod: computed(() => store.state.projectionMethod),
            colorBy: computed(() => store.state.colorBy),
            view: computed(() => store.state.view),
            mode: computed(() => store.state.mode),
            userTheme: computed(() => store.state.userTheme),
            curLayer: computed(() => store.state.layer),
            curHead: computed(() => store.state.head),
            doneLoading: computed(() => store.state.doneLoading),
            showAll: computed(() => store.state.showAll),
            showAttention: computed(() => store.state.showAttention),
            sizeByNorm: computed(() => store.state.sizeByNorm),
            zoom: nullInitialView.zoom,
            clickedPoint: "" as any,
            activePoints: [] as Typing.Point[],
            dimension: computed(() => store.state.dimension),
            cursorX: 0,
            cursorY: 0,
            transitionInProgress: false,
            attentionLoading: computed(() => store.state.attentionLoading),
            modelType: computed(() => store.state.modelType),
            resetting: false
        });

        let deckgl = {} as Deck;

        let shallowData = shallowRef({
            points: [],
            headings: [],
            range: {
                x: [0, 0],
                y: [0, 0],
            },
            images: []
        } as Typing.Projection);

        // helper functions for layers
        const getPointCoordinate = (d: Typing.Point) => {
            switch (state.projectionMethod) {
                case "tsne":
                    return state.dimension === "2D" ? d.coordinate.tsne : d.coordinate.tsne_3d;
                case "umap":
                    return state.dimension === "2D" ? d.coordinate.umap : d.coordinate.umap_3d;
                case "pca":
                    return state.dimension === "2D" ? d.coordinate.pca : d.coordinate.pca_3d;
                default:
                    throw Error("Invalid projection method!");
            }
        };

        const getImageSize = () => {
            const zoom = state.zoom;
            let size = (((zoom + 1.5) / 10.5 + 0.0001) ** 2) * 115
            return size < 1 ? 1 : size;
        };

        const getImagePath = (d: Typing.Point) => {
            if (state.colorBy == "no_outline") {
                return d.originalPatchPath
            } else {
                return d.imagePath
            }
        }

        const tree = new RBush(); // fast label overlap detection
        const sizeMeasurer = (label: string, fontSize: number) => {
            let threshold =
                state.zoom <= 5
                    ? 2.5
                    : state.zoom <= 7
                        ? 3
                        : state.zoom <= 8.5
                            ? 3.5
                            : 4.5;
            if (state.zoom > 3.5 && state.zoom <= 8.5 && state.dimension === "3D") {
                threshold *= 1.5;
            }
            const size = {
                width: fontSize * (1 / Math.pow(threshold, state.zoom)) * label.length,
                height: fontSize
            };
            return size;
        }

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
                return false;
            }
            tree.insert(new_coord);
            return true;
        }

        // helper when drawing attention lines
        function get_k_attn(k: number) {
            let attention = state.curAttn;
            if (state.modelType == "vit-16" || state.modelType == "vit-32") {
                attention = state.attentionByToken.attns;
            }

            let top_attn: any = [];
            // find top k attention weights for each query
            for (let row = 0; row < attention.length; row++) {
                const row_with_i = attention[row].map((v, index) => [index, v]);
                row_with_i.sort((a, b) => a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0);

                let top_k = row_with_i.splice(0, k);
                // add points to top_attn data
                top_k.map((v) => {
                    if (v[1] >= 0.05) { // skip very low opacity lines
                        top_attn.push({ from: row, to: v[0], att: v[1] })
                    }
                });
            }
            return top_attn;
        }

        // LAYERS
        const toLineLayer = (points: Typing.Point[]) => {
            // show attention lines on scatterplot
            const queries = points.filter((v) => v.type === "query");
            const keys = points.filter((v) => v.type === "key");

            // get top k attns for each query
            let top_attn = get_k_attn(2);

            return new LineLayer({
                id: "attention-line-layer",
                pickable: false,
                data: top_attn,
                widthMaxPixels: 10,
                widthScale: 5,
                getSourcePosition: (d: any) => getPointCoordinate(queries[d.from]),
                getTargetPosition: (d: any) => getPointCoordinate(keys[d.to]),
                getColor: (d: any) => {
                    const opacity = d.att * 255;
                    return [255, 195, 0, opacity];
                },
                updateTriggers: {
                    getSourcePosition: [state.projectionMethod, state.dimension, state.curAttn],
                    getTargetPosition: [state.projectionMethod, state.dimension, state.curAttn],
                    getColor: [state.curAttn]
                }
            });
        }

        const toPointOutlineLayer = (points: Typing.Point[]) => {
            // draw thicker line around clicked on point
            return new ScatterplotLayer({
                id: "point-outline-layer",
                pickable: false,
                data: points,
                radiusMaxPixels: 8,
                stroked: true,
                getPosition: (d: Typing.Point) => getPointCoordinate(d),
                getRadius: (d: Typing.Point) => {
                    return state.mode === "single" && state.sizeByNorm
                        ? (0.15 + d.normScaled * 0.5) * 3
                        : 4
                },
                getFillColor: [255, 195, 0, 255],
                getLineColor: state.userTheme != "light-theme" ? [255, 255, 255, 255] : [0, 0, 0, 255],
                getLineWidth: 1 / state.zoom,
                lineWidthMaxPixels: 1,
                updateTriggers: {
                    getFillColor: [state.userTheme],
                    getRadius: [state.sizeByNorm],
                    getPosition: [state.projectionMethod, state.dimension]
                },
            })
        }

        const toPointLayer = (points: Typing.Point[]) => {
            // main scatterplot(s)
            return new ScatterplotLayer({
                id: "point-layer",
                pickable: state.mode == 'single' && state.modelType == "bert" || state.modelType == "gpt-2",
                data: points,
                radiusMaxPixels: 5,
                stroked: state.mode == 'single',
                getPosition: (d: Typing.Point) => getPointCoordinate(d),
                getRadius: (d: Typing.Point) => {
                    let defaultSize = 0.4,
                        highlightedSize = 2;

                    if (state.mode === "matrix") {
                        highlightedSize = 4;
                    }

                    if (state.mode === "single" && state.sizeByNorm) {
                        // scale dot size by norm if checkbox on
                        defaultSize = 0.15 + d.normScaled * 0.5;
                        highlightedSize = defaultSize * 2;
                    }

                    // otherwise, proceed as normal
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
                            case 'query_key':
                                return d.color.query_key
                            case 'position':
                                return d.color.position
                            case 'pos_mod_5':
                                return d.color.pos_mod_5
                            case 'punctuation':
                                return d.color.punctuation
                            case 'embed_norm':
                                return d.color.embed_norm
                            case 'token_length':
                                return d.color.token_length
                            case 'sent_length':
                                return d.color.sent_length
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
                    if (state.view != 'search' && !state.highlightedTokenIndices.length) return defaultColor;
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
                    if (state.mode === 'matrix' || state.attentionLoading) {
                        // stop event propagation
                        return;
                    }
                    if (state.view != "attn") { // switch to attention view if not already
                        store.commit("setView", 'attn');
                    }
                    store.commit("updateAttentionLoading", true);

                    let pt = info.object as Typing.Point;
                    state.clickedPoint = pt;
                    store.dispatch("setClickedPoint", pt);

                    let pt_info = state.tokenData[pt.index];
                    let offset = state.tokenData.length / 2;
                    let start_index = pt.index - pt_info.pos_int;

                    let same_indices = Array.from({ length: pt_info.length }, (x, i) => i + start_index);
                    if (pt_info.type === "key") {
                        start_index -= offset;
                    } else {
                        start_index += offset;
                    }

                    let opposite_indices = Array.from({ length: pt_info.length }, (x, i) => i + start_index);
                    let tokenIndices = [...same_indices, ...opposite_indices];
                    store.commit("setHighlightedTokenIndices", tokenIndices);
                },
                updateTriggers: {
                    getFillColor: [state.colorBy, state.highlightedTokenIndices, state.userTheme],
                    getRadius: [state.highlightedTokenIndices, state.sizeByNorm],
                    getPosition: [state.projectionMethod, state.dimension]
                },
            });
        };


        const toColorLayer = (points: Typing.Point[]) => {
            const minSize = state.mode == "single" ? 15 : 1.5;
            const maxSize = state.mode == "single"
                ? 25
                : state.zoom < 1
                    ? 7
                    : 15;
            return new IconLayer({
                id: 'coloring-layer',
                data: points,
                pickable: false,
                // iconAtlas and iconMapping are required
                // getIcon: return a string
                iconAtlas: 'https://raw.githubusercontent.com/catherinesyeh/attention-viz/VIT-vis/img/coloring_helper.png',
                iconMapping: {
                    border: {
                        x: 64,
                        y: 0,
                        width: 64,
                        height: 64,
                        mask: true
                    }
                },
                getIcon: d => 'border',
                getSize: (d: Typing.Point) => {
                    const size = getImageSize();
                    const defaultSize = size,
                        highlightedSize = state.mode == 'single'
                            ? size
                            : size * 4;
                    if (state.highlightedTokenIndices.length === 0) return defaultSize;
                    return state.highlightedTokenIndices.includes(d.index)
                        ? highlightedSize
                        : defaultSize;
                },
                sizeScale: 1,
                sizeMaxPixels: maxSize,
                sizeMinPixels: minSize,
                sizeUnits: "pixels",
                getPosition: (d: Typing.Point) => getPointCoordinate(d),
                getColor: (d: Typing.Point) => {
                    const getColor = (d: Typing.Point) => {
                        switch (state.colorBy) {
                            case 'query_key':
                                return d.color.query_key
                            case 'row':
                                return d.color.row
                            case 'column':
                                return d.color.column
                            case 'qk_map':
                                return d.color.qk_map
                            default:
                                throw Error('invalid color channel')
                        }
                    }

                    const defaultColor = [...getColor(d), 145],
                        highlightColorQuery = [84, 148, 61, 0],
                        highlightColorQueryDark = [157, 216, 135, 0],
                        highlightColorKey = [193, 91, 125, 0],
                        highlightColorKeyDark = [234, 138, 170, 0],
                        unactiveColor = [...getColor(d), 0];

                    if (state.view != 'search' && !state.highlightedTokenIndices.length) return defaultColor;
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
                updateTriggers: {
                    getSize: [state.zoom, state.highlightedTokenIndices, state.mode, state.dimension],
                    getPosition: [state.projectionMethod, state.dimension],
                    getColor: [state.colorBy, state.highlightedTokenIndices, state.userTheme],
                }
            });
        }

        const toImageLayer = (points: Typing.Point[]) => {
            const minSize = state.mode == "single" ? 15 : 1.5;
            const maxSize = state.mode == "single"
                ? 25
                : state.zoom < 1
                    ? 7
                    : 15;
            return new IconLayer({
                id: 'image-scatter-layer',
                pickable: state.mode == 'single' && state.modelType == "vit-16" || state.modelType == "vit-32",
                data: points,
                stroked: state.mode == 'single',
                getIcon: d => ({
                    url: getImagePath(d),
                    width: 40,
                    height: 40,
                }),
                getPosition: (d: Typing.Point) => getPointCoordinate(d),
                getSize: (d: Typing.Point) => {
                    const size = getImageSize();
                    const defaultSize = size,
                        highlightedSize = state.mode == 'single'
                            ? size
                            : size * 4;
                    if (state.highlightedTokenIndices.length === 0) return defaultSize;
                    return state.highlightedTokenIndices.includes(d.index)
                        ? highlightedSize
                        : defaultSize;
                },
                sizeScale: 1,
                sizeMaxPixels: maxSize,
                sizeMinPixels: minSize,
                sizeUnits: "pixels",
                getColor: (d: Typing.Point) => {
                    if (state.view != 'search' && state.highlightedTokenIndices.length === 0) return [0, 0, 0, 255];
                    return state.highlightedTokenIndices.includes(d.index)
                        ? [0, 0, 0, 255]
                        : [0, 0, 0, 20];
                },
                onClick: (info, event) => {
                    if (state.mode === 'matrix' || state.attentionLoading) {
                        // stop event propagation
                        return;
                    }
                    if (state.view != "attn") {
                        store.commit("setView", 'attn');
                    }
                    store.commit("updateAttentionLoading", true);

                    let pt = info.object as Typing.Point;

                    state.clickedPoint = pt;
                    store.dispatch("setClickedPoint", pt);

                    let pt_info = state.tokenData[pt.index];
                    let offset = 0;
                    if (state.modelType == "vit-32") {
                        offset = 50;
                    }
                    else {
                        offset = 197;
                    }

                    let start_index = 0
                    if (pt.value == "CLS") {
                        console.log("CLS Token")
                        start_index = pt.index - (pt_info.position * Math.sqrt(offset - 1) + pt_info.pos_int);
                    } else {
                        start_index = pt.index - (pt_info.position * Math.sqrt(offset - 1) + pt_info.pos_int + 1);
                    }

                    let same_indices = Array.from({ length: offset }, (x, i) => i + start_index);
                    if (pt_info.type === "key") {
                        start_index -= offset;
                    } else {
                        start_index += offset;
                    }

                    let opposite_indices = Array.from({ length: offset }, (x, i) => i + start_index);
                    let tokenIndices = [...same_indices, ...opposite_indices];
                    store.commit("setHighlightedTokenIndices", tokenIndices);
                },
                updateTriggers: {
                    getSize: [state.zoom, state.highlightedTokenIndices, state.mode, state.dimension],
                    getPosition: [state.projectionMethod, state.dimension],
                    getColor: [state.highlightedTokenIndices],
                    getIcon: [state.colorBy]
                }
            })
        };

        const toLabelOutlineLayer = (points: Typing.Point[], visiblePoints: boolean[]) => {
            // white outline around text
            return new TextLayer({
                id: "label-outline-layer",
                data: points,
                pickable: false,
                characterSet: 'auto',
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

                    if (state.modelType == "vit-32" || state.modelType == "vit-16") {
                        coord[0] += 1 / Math.pow(3, state.zoom);
                    }

                    let offset = 1 / Math.pow(1.5, state.zoom) + whiteOffset;

                    return [coord[0] + offset, coord[1] + whiteOffset];
                },
                getText: (d: Typing.Point) => d.value,
                getColor: (d: Typing.Point) => {
                    if (!state.showAll || !visiblePoints[d.index]) {
                        return [255, 255, 255, 0];
                    }
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
            // main text labels for scatterplot points
            return new TextLayer({
                id: "point-label-layer",
                data: points,
                pickable: false,
                characterSet: 'auto',
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
                    if (state.view != 'search' && state.highlightedTokenIndices.length === 0)
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
                    getColor: [state.zoom, state.highlightedTokenIndices, state.userTheme, state.showAll],
                    getPosition: [state.projectionMethod, state.zoom, state.dimension]
                },
            });
        };

        const toAttentionLabelLayer = (points: Typing.Point[]) => {
            // text labels for tokens in currently highlighted sentence
            return new TextLayer({
                id: "attention-label-layer",
                data: points,
                pickable: false,
                characterSet: 'auto',
                getPosition: (d: Typing.Point) => {
                    let coord = getPointCoordinate(d);
                    let offset = 1 / (0.3 * state.zoom);
                    if (state.zoom > 4 && state.zoom <= 6) {
                        offset = 1 / (0.5 * state.zoom);
                    }
                    else if (state.zoom > 6) {
                        offset = 1 / ((state.zoom - 5) * state.zoom);
                    }
                    return coord.length == 2
                        ? [coord[0] + offset, coord[1]]
                        : [coord[0] + offset, coord[1], coord[2] + offset];
                },
                getText: (d: Typing.Point) => {
                    if (state.modelType == "bert" || state.modelType == "gpt-2") {
                        return state.tokenData[d.index].pos_int + ":" + d.value
                    } else {
                        return " " + state.tokenData[d.index].value + "\n (" + state.tokenData[d.index].position + "," + state.tokenData[d.index].pos_int + ")"
                    }
                },
                getColor: (d: Typing.Point) => {
                    return d.type == "query"
                        ? state.userTheme == "light-theme"
                            ? [43, 91, 25, defaultOpacity]
                            : [194, 232, 180, defaultOpacity]
                        : state.userTheme == "light-theme"
                            ? [117, 29, 58, defaultOpacity]
                            : [240, 179, 199, defaultOpacity]
                },
                getSize: 12,
                getAngle: 0,
                getTextAnchor: "start",
                getAlignmentBaseline: "center",
                updateTriggers: {
                    getColor: [state.userTheme],
                    getPosition: [state.projectionMethod, state.zoom, state.dimension]
                },
            })
        };

        const toPlotHeadLayer = (headings: Typing.PlotHead[]) => {
            // layer/head label for each plot
            return new TextLayer({
                id: "text-layer",
                data: headings,
                pickable: false,
                getPosition: (d: Typing.PlotHead) => d.coordinate,
                getText: (d: Typing.PlotHead) => state.mode == 'single' ? d.title[1] : d.title[0],
                getSize: 20,
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
            // invisible polygon overlay to allow us to click on plots in matrix mode
            return new PolygonLayer({
                id: "overlay-layer",
                data: headings,
                pickable: state.mode == "matrix",
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
                    zoomToPlot(obj.layer, obj.head, true, true);
                },
                updateTriggers: {
                    getPosition: [state.projectionMethod, state.zoom]
                },
            });
        };

        // compute + render layers for current view
        const toLayers = () => {
            let { points, headings } = shallowData.value;
            if (!state.doneLoading) { // don't initialize until all data is loaded
                return [];
            }

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

                let layers = [];
                let attn_points: Typing.Point[] = [];
                if (state.view === 'attn') {
                    if (state.showAttention) { // show lines in attention view if checkbox on
                        if (state.clickedPoint != "") { // already in attn view
                            state.clickedPoint = layer_points[state.clickedPoint.index];
                        }
                        attn_points = layer_points.filter((v) => state.highlightedTokenIndices.includes(v.index));
                        layers.push(toLineLayer(attn_points));
                    }
                    // add extra outline for clicked point
                    if (state.modelType == "bert" || state.modelType == "gpt-2") {
                        layers.push(toPointOutlineLayer([state.clickedPoint]));
                    }
                }

                if (state.modelType == "bert" || state.modelType == "gpt-2") {
                    layers.push(toPointLayer(layer_points));
                }
                else if (state.modelType == "vit-16" || state.modelType == "vit-32") {
                    if (state.colorBy == "query_key" || state.colorBy == "no_outline") {
                        layers.push(toImageLayer(layer_points));
                    } else {
                        layers.push(toImageLayer(layer_points));
                        layers.push(toColorLayer(layer_points));
                    }
                }

                if (state.view == "attn") {
                    if (attn_points.length == 0) {
                        // always show labels in attn view
                        attn_points = layer_points.filter((v) => state.highlightedTokenIndices.includes(v.index));
                    }
                    layers.push(toAttentionLabelLayer(attn_points));
                }
                layers.push(toPlotHeadLayer([layer_headings]));

                if (state.view != "attn" && state.showAll) {
                    if (state.dimension == "2D") {
                        // only white outline around labels in 2d view
                        layers.push(toLabelOutlineLayer(layer_points, visiblePoints));
                    }

                    layers.push(toPointLabelLayer(layer_points, visiblePoints));
                }
                return layers;
            }
            // else: return matrix view
            if (state.modelType == "bert" || state.modelType == "gpt-2") {
                return [toPointLayer(points), toPlotHeadLayer(headings), toOverlayLayer(headings)];
            }
            else {
                if (state.colorBy == "query_key" || state.colorBy == "no_outline") {
                    return [toImageLayer(points), toPlotHeadLayer(headings), toOverlayLayer(headings)];
                }
                return [toImageLayer(points), toColorLayer(points), toPlotHeadLayer(headings), toOverlayLayer(headings)];
            }
        };

        /**
         * The main function for drawing the scatter matrices
         */
        const initMatrices = () => {
            const { points, headings, range } = shallowData.value;
            console.log("initMatrices", points, headings);
            if (!points || !points.length) return;

            // clear tooltips
            document.querySelectorAll(".deck-tooltip").forEach((v) => v.remove());

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

            // main deckgl object
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
                            case 'query_key':
                            case 'position':
                            case 'punctuation':
                            case 'sent_length':
                            case 'column':
                            case 'row':
                            case 'qk_map':
                            case 'no_outline':
                                return d.msg.position
                            case 'pos_mod_5':
                                return d.msg.categorical
                            case 'embed_norm':
                                return d.msg.norm
                            case 'token_length':
                                return d.msg.length
                            default:
                                throw Error('invalid msg channel')
                        }
                    }
                    return object && {
                        html: state.mode === 'matrix' ? object.title[0] : getMsg(object),
                        style: {
                            color: "#fff",
                            background: "#222"
                        },
                    }
                },
                onViewStateChange: (param) => {
                    if (param.interactionState.inTransition) {
                        clearTimeout(timeout);
                        timeout = setTimeout(function () {
                            handleRequest(param);
                        }, 100);
                    }
                },
            });
            store.commit("updateRenderState", false);
        };

        onwheel = (event: WheelEvent) => { // track cursor position on zoom
            if (state.transitionInProgress) {
                event.preventDefault;
                return;
            }

            if (state.mode === "matrix") {
                // only run if matrix mode
                state.cursorX = event.offsetX;
                state.cursorY = event.offsetY;
            }
        }

        const handleRequest = (param: any) => {
            if (state.resetting) {
                state.resetting = false;
                return;
            }
            // deal with transition b/t single & matrix mode and updating zoom
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
                    zoomToPlot(obj.layer, obj.head, false, false);
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
            state.transitionInProgress = true;
            if (state.mode !== "matrix") {
                store.commit("setMode", "matrix");
                store.commit("setLayer", "");
                store.commit("setHead", "");
                state.activePoints = [];
            }

            if (state.view == 'attn') {
                store.commit("setHighlightedTokenIndices", []);
            }

            state.viewState = initialState;

            if (clicked) {
                deckgl.setProps({
                    initialViewState: nullInitialView,
                });
                deckgl.setProps({
                    initialViewState: state.viewState,
                });
                state.zoom = -1;
                state.resetting = false;
            }
            state.transitionInProgress = false;
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
                    initialViewState: nullInitialViewZoom
                });
                state.zoom = zoomThreshold;
                state.resetting = true;
            }
            deckgl.setProps({
                initialViewState: state.viewState,
            });
        }

        const computedProjection = () => {
            let { matrixData, tokenData } = state;
            if (matrixData.length && tokenData.length) {
                if (state.modelType == "gpt-2" || state.modelType == "bert") {
                    let projData = computeMatrixProjection(matrixData, tokenData);
                    shallowData.value = projData;
                }
                else if (state.modelType == "vit-16" || state.modelType == "vit-32") {
                    let projData = computeVitMatrixProjection(matrixData, tokenData);
                    shallowData.value = projData;
                }
            }

            // switch on labels if bert/gpt; off if vit
            if ((state.modelType == "bert" || state.modelType == "gpt-2") && !state.showAll) {
                store.commit("setShowAll", true);
            } else if ((state.modelType == "vit-32" || state.modelType == "vit-16") && state.showAll) {
                store.commit("setShowAll", false);
            }

            if (state.mode == "single") {
                state.zoom = zoomThreshold; // reset zoom threshold
            }
        };

        /**
         * Search and highlight tokens
         * @param str
         */
        const onSearch = (str: string) => {
            state.transitionInProgress = true;
            str = str.toLowerCase(); // convert to lowercase first to match other tokens
            let tokenIndices = [] as number[];
            if (str != "") {
                tokenIndices = state.tokenData
                    .map((x, idx) => (x.value.toLowerCase() === str ? idx : undefined))
                    .filter((x) => x) as number[];
            }
            store.commit("setHighlightedTokenIndices", tokenIndices);
            state.transitionInProgress = false;
            return tokenIndices.length;
        };

        const printViewport = () => {
            console.error("viewport", deckgl.getViewports());
        };

        const zoomToPlot = (layer: number, head: number, clicked: boolean, transition: boolean) => {
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
                // transitionDuration: transition ? 1000 : 0,
                transitionDuration: 0,
            };
            state.viewState = initialStateZoom;
            state.zoom = zoomThreshold;
            state.resetting = true;

            if (clicked) {
                deckgl.setProps({
                    initialViewState: state.viewState
                });
            }

            console.log("Layer " + layer + ", Head " + head);
            store.commit("setLayer", layer);
            store.commit("setHead", head);
        };

        onMounted(() => {
            console.log("onMounted");
            if (state.doneLoading) {
                computedProjection();
            }
        });

        const getImages = () => {
            let { images } = shallowData.value;
            return images;
        }

        // watchers
        watch([() => state.matrixData, () => state.tokenData],
            () => {
                if (state.doneLoading) {
                    computedProjection();
                }
            }
        );

        watch([shallowData], () => {
            // redraw matrices if data changes
            if (state.doneLoading) {
                initMatrices();
            }
        });

        // this might still need some tweaking...
        watch(() => state.dimension, () => {
            // deal with 2D/3D transition
            deckgl.setProps({
                views: state.dimension == "3D" ?
                    new OrbitView({
                        orbitAxis: 'Y'
                    })
                    : new OrthographicView({
                        flipY: false,
                    }),
            });

            const curZoom = deckgl.getViewports()[0].zoom;

            let switchThreshold = zoomThreshold;
            if (state.dimension === "3D") {
                resetZoom();
                switchThreshold = 1.5;
            }

            if (state.mode == "single") {
                state.zoom = Math.max(curZoom, switchThreshold);
            } else { // matrix mode
                state.zoom = Math.min(curZoom, switchThreshold - 0.1);
            }
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
                () => state.showAll,
                () => state.showAttention,
                () => state.sizeByNorm,
                () => state.attentionLoading,
                () => state.clickedPoint,
                () => state.curAttn,
                () => state.view
            ],
            () => {
                if (state.view === "attn" && state.attentionLoading) {
                    return;
                }
                // wait until attention info done loading
                deckgl.setProps({ layers: [...toLayers()] });
            }
        );

        watch([() => state.doneLoading, () => state.curLayer, () => state.curHead],
            () => {
                if (state.doneLoading && state.activePoints.length != 0 && state.view === "attn" && state.clickedPoint != "") {
                    // fix attention view
                    store.commit("updateAttentionLoading", true);
                    let ind = state.clickedPoint.index;
                    let pt = state.activePoints[ind];
                    state.clickedPoint = pt;
                    store.dispatch("setClickedPoint", pt);
                }
            }
        )

        watch(() => state.highlightedTokenIndices,
            () => {
                if (state.highlightedTokenIndices.length == 0) {
                    // reset highlighted token indices
                    if (state.view == "attn") {
                        store.commit("setView", "none");
                        state.clickedPoint = "";
                    }
                }
            })

        // expose functions to the parent
        context.expose({
            reset,
            resetZoom,
            onSearch,
            printViewport,
            zoomToPlot,
            getImages
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
