<template>
    <div class="viewHead" id="attn-map-view">
        <div class="align-top">
            <p>Sentence View
                <Transition>
                    <span v-show="showAttn">({{ layerHead }})</span>
                </Transition>
            </p>
            <Transition>
                <div class="attn-btns" v-show="showAttn">
                    <a-button id="attn-reset" class="clear" type="link" @click="resetAttn">reset</a-button>
                    <span>|</span>
                    <a-button id="attn-clear" class="clear" type="link" @click="clearAttn">clear</a-button>
                </div>
            </Transition>
        </div>
        <span class="subtitle">{{ attnMsg }}</span>
        <Transition>
            <div v-show="showAttn">
                <p class="label">Hide</p>
                <a-checkbox v-model:checked="hideFirst" @click="hideTokens('first')" v-show="model == 'gpt'">first
                    token</a-checkbox>
                <a-checkbox v-model:checked="hideFirst" @click="hideTokens('first')"
                    v-show="model == 'bert'">[cls]</a-checkbox>
                <a-checkbox v-model:checked="hideLast" @click="hideTokens('last')"
                    v-show="model == 'bert'">[sep]</a-checkbox>
            </div>
        </Transition>
        <Transition>
            <div id="bertviz" v-show="showAttn">
                <div id="vis"></div>
            </div>
        </Transition>
    </div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch } from "vue";
import * as _ from "underscore";
import { useStore } from "@/store/index";
import * as d3 from "d3";
import moment from "moment";
import { getAttentionByToken } from "@/services/dataService";

type Config = {
    attention: any;
    filter: string;
    rootDivId: string;
    nLayers: number;
    nHeads: number;
    layers: number[];
    headVis: any;
    initialTextLength: number;
    layer_seq: number;
    layer: number;
}

const TEXT_SIZE = 12;
const BOXWIDTH = 80;
const BOXHEIGHT = 18;
const MATRIX_WIDTH = 100;
const TEXT_TOP = 22;

export default {
    components: {},
    setup() {
        const store = useStore();

        const state = reactive({
            attentionByToken: computed(() => store.state.attentionByToken),
            showAttn: false,
            attnMsg: "click a plot to zoom in",
            highlightedTokenIndices: computed(() => store.state.highlightedTokenIndices),
            view: computed(() => store.state.view),
            curLayer: computed(() => store.state.layer),
            curHead: computed(() => store.state.head),
            layerHead: "",
            userTheme: computed(() => store.state.userTheme),
            mode: computed(() => store.state.mode),
            model: computed(() => store.state.modelType),
            attn_vals: [] as number[][],
            cur_attn: [] as number[][],
            hidden: { left: [] as number[], right: [] as number[] },
            hideFirst: false,
            hideLast: false
        });

        const hideKey = (ind: number) => {
            return state.cur_attn.map((row: number[]) => {
                let rem_attn = 1 - row[ind];
                return row.map((cell: number, index: number) => {
                    if (index != ind) {
                        return rem_attn == 0 ? 0 : Math.min(1, cell / rem_attn);
                    }
                    return 0;
                })
            })
        }

        // start bertviz
        const bertviz = () => {
            // parse info from data
            let { attentionByToken } = state;
            state.attn_vals = attentionByToken.attns;
            const token_type: string = attentionByToken.token.type;
            const token_pos: number = attentionByToken.token.pos_int;
            const token_text: string[] = attentionByToken.token.sentence.split(" ");
            if (token_type == "key") { // flip graph if key
                state.attn_vals = transpose(state.attn_vals);
            }
            state.cur_attn = state.attn_vals;
            state.hidden["left"] = [];
            state.hidden["right"] = [];

            // hide first/last tokens if checkboxes selected
            if (state.hideFirst) {
                state.cur_attn = hideKey(0);
                state.hidden["right"].push(0);
            }
            if (state.hideLast) {
                state.cur_attn = hideKey(token_text.length - 1);
                state.hidden["right"].push(token_text.length - 1);
            }

            // const layer = attentionByToken.layer;
            // const head = attentionByToken.head;
            state.layerHead = "L" + state.curLayer + " H" + state.curHead;

            const params = {
                attention: [
                    {
                        name: null,
                        attn: [[state.cur_attn]],
                        left_text: token_text,
                        right_text: token_text,
                        layer: 0,
                        head: 0,
                    },
                ],
                default_filter: "0",
                root_div_id: "bertviz",
                layer: 0,
                heads: [0],
                include_layers: [0],
            };

            // let headColors = d3.scaleOrdinal(d3.schemePastel1);
            let config: Config = initialize();
            renderVis();

            function initialize() {
                let config: Config = {
                    attention: params["attention"],
                    filter: params["default_filter"],
                    rootDivId: params["root_div_id"],
                    layers: params["include_layers"],
                    nHeads: 0,
                    nLayers: 0,
                    headVis: [],
                    initialTextLength: 0,
                    layer: 0,
                    layer_seq: 0
                }
                config.nLayers = config.attention[config.filter]["attn"].length;
                config.nHeads = config.attention[config.filter]["attn"][0].length;

                if (params["heads"]) {
                    config.headVis = new Array(config.nHeads).fill(false);
                    params["heads"].forEach((x) => (config.headVis[x] = true));
                } else {
                    config.headVis = new Array(config.nHeads).fill(true);
                }
                config.initialTextLength =
                    config.attention[config.filter].right_text.length;
                config.layer_seq =
                    params["layer"] == null
                        ? 0
                        : config.layers.findIndex((layer) => params["layer"] === layer);
                config.layer = config.layers[config.layer_seq];
                return config
            }

            function renderVis() {
                // Load parameters
                const attnData = config.attention[config.filter];
                const leftText = attnData.left_text;
                const rightText = attnData.right_text;

                // Clear vis
                document.getElementById("vis")!.innerHTML = "";

                // Select attention for given layer
                const layerAttention = attnData.attn[config.layer_seq];

                // Determine size of visualization
                const height =
                    Math.max(leftText.length, rightText.length) * BOXHEIGHT + TEXT_TOP;
                const svg = d3
                    .select(`#${config.rootDivId} #vis`)
                    .append("svg")
                    .attr("id", "main-svg")
                    .attr("width", "100%")
                    .attr("height", height + "px");

                // set up gradient
                const defs = svg.append("defs");

                const gradient = defs.append("linearGradient")
                    .attr("id", "svgGradient")
                    .attr("x1", "0%")
                    .attr("x2", "100%")
                    .attr("y1", "0%")
                    .attr("y2", "100%")
                    // .attr("gradientTransform", "rotate(-15)")
                    .attr("gradientUnits", "userSpaceOnUse");

                gradient.append("stop")
                    .attr('class', 'start')
                    .attr("offset", "0%")
                    .attr("stop-color", "#9dd887")
                    .attr("stop-opacity", 1);

                gradient.append("stop")
                    .attr('class', 'end')
                    .attr("offset", "100%")
                    .attr("stop-color", "#ea8aaa")
                    .attr("stop-opacity", 1);

                // Display tokens on left and right side of visualization
                renderText(svg, leftText, true, layerAttention, 0);
                renderText(
                    svg,
                    rightText,
                    false,
                    layerAttention,
                    MATRIX_WIDTH + BOXWIDTH
                );

                // bold current selected token
                const side = (token_type == 'query') ? "left" : "right";
                let selected = document.querySelectorAll("#" + side + " text")[token_pos + 1];
                selected.classList.add("bold");
                selected.classList.add(token_type);

                // Render attention arcs
                renderAttention(svg, layerAttention);
            }

            function renderText(svg: any, text: string[], isLeft: boolean, attention: any, leftPos: number) {
                const textContainer = svg
                    .append("svg:g")
                    .attr("id", isLeft ? "left" : "right");

                // top labels
                const topLabels = textContainer
                    .append("text")
                    .attr("x", leftPos)
                    .attr("y", 0)
                    .text(isLeft ? "query" : "key")
                    .attr("font-size", (TEXT_SIZE + 2) + "px")
                    .classed("bold", true)
                    .classed(isLeft ? "query" : "key", true);

                if (isLeft) {
                    topLabels
                        .style("text-anchor", "end")
                        .attr("dx", BOXWIDTH - 0.5 * TEXT_SIZE)
                        .attr("dy", TEXT_SIZE);
                } else {
                    topLabels
                        .style("text-anchor", "start")
                        .attr("dx", +0.5 * TEXT_SIZE)
                        .attr("dy", TEXT_SIZE);
                }

                // Add attention highlights superimposed over words
                textContainer
                    .append("g")
                    .classed("attentionBoxes", true)
                    .selectAll("g")
                    .data(attention)
                    .enter()
                    .append("g")
                    .attr("head-index", (d: any, i: number) => i)
                    .selectAll("rect")
                    .data((d: any) => (isLeft ? d : transpose(d)))
                    // if right text and query token OR right text and key token, transpose attention to get right-to-left / left-to-right weights
                    .enter()
                    .append("rect")
                    .attr("x", function (this: any) {
                        var headIndex = +this.parentNode.getAttribute("head-index");
                        return leftPos + boxOffsets(headIndex);
                    })
                    .attr("y", +1 * BOXHEIGHT)
                    .attr("width", BOXWIDTH / activeHeads())
                    .attr("height", BOXHEIGHT)
                    .attr("fill", function () {
                        // return headColors(+this.parentNode.getAttribute("head-index"));
                        return isLeft ? "rgb(157, 216, 135)" : "rgb(234, 138, 170)";
                    })
                    .style("opacity", 0.0);

                const tokenContainer = textContainer
                    .append("g")
                    .selectAll("g")
                    .data(text)
                    .enter()
                    .append("g");

                // Add gray background that appears when hovering over text
                tokenContainer
                    .append("rect")
                    .classed("background", true)
                    .style("opacity", 0.0)
                    // .attr("fill", "lightgray")
                    .attr("x", leftPos)
                    .attr("y", (d: any, i: number) => TEXT_TOP + i * BOXHEIGHT)
                    .attr("width", BOXWIDTH)
                    .attr("height", BOXHEIGHT);

                // Add token text
                const textEl = tokenContainer
                    .append("text")
                    .text((d: any) => d)
                    .attr("font-size", TEXT_SIZE + "px")
                    .style("cursor", "default")
                    .style("-webkit-user-select", "none")
                    .classed("token-text", true)
                    .attr("x", leftPos)
                    .attr("y", (d: any, i: number) => TEXT_TOP + i * BOXHEIGHT);

                if (isLeft) {
                    textEl
                        .style("text-anchor", "end")
                        .attr("dx", BOXWIDTH - 0.5 * TEXT_SIZE)
                        .attr("dy", TEXT_SIZE);
                } else {
                    textEl
                        .style("text-anchor", "start")
                        .attr("dx", +0.5 * TEXT_SIZE)
                        .attr("dy", TEXT_SIZE);
                }

                tokenContainer.on("click", function (this: any, e: Event, d: any) {
                    // toggle lines on and off on token click
                    const select = tokenContainer.nodes();
                    const ind = select.indexOf(this);
                    if (ind == 0) {
                        state.hideFirst = !state.hideFirst;
                    } else if (ind == select.length - 1) {
                        state.hideLast = !state.hideLast;
                    }
                    // let hidden = d3.select(this).classed("clicked");
                    // d3.select(this).classed("clicked", !hidden);
                    let hidden, new_attn;
                    if (isLeft) { // query
                        let hid_index = state.hidden["left"].indexOf(ind);
                        if (hid_index != -1) { // was hidden, now unhide
                            hidden = true;
                            delete state.hidden["left"][hid_index];
                        } else { // was visible, now hide
                            hidden = false;
                            state.hidden["left"].push(ind);
                        }

                        let sent_length = state.cur_attn[ind].length;
                        if (!hidden) { // hide
                            state.cur_attn[ind] = new Array(sent_length).fill(0);
                        } else { // show
                            new_attn = state.cur_attn[ind].map((x, index) => {
                                // reset to current state (account for any tokens that are hidden on right side)
                                // if (!state.hidden["right"].includes(index)) {
                                return state.attn_vals[ind][index];
                                // }
                                // return 0;
                            });
                            state.cur_attn[ind] = new_attn;
                        }
                    } else { // key
                        let hid_index = state.hidden["right"].indexOf(ind);
                        if (hid_index != -1) { // was hidden, now unhide
                            hidden = true;
                            delete state.hidden["right"][hid_index];
                        } else { // was visible, now hide
                            hidden = false;
                            state.hidden["right"].push(ind);
                        }
                        if (!hidden) { // hide
                            // 0 out cells corresponding to clicked on token
                            new_attn = hideKey(ind);
                        } else { // show again
                            // add back cells corresponding to clicked on token
                            new_attn = state.cur_attn.map((row: number[], index: number) => {
                                // let token_val = state.attn_vals[index][ind];
                                let rem_attn = 1;
                                let row_index = index;
                                state.hidden["right"].forEach((x, index) => {
                                    // account for other hidden keys too
                                    rem_attn -= state.attn_vals[row_index][x];
                                })
                                // let rem_attn = 1 - token_val;
                                return row.map((cell: number, index: number) => {
                                    // if (index != ind) {
                                    //     return cell * rem_attn;
                                    // }
                                    return rem_attn == 0 || state.hidden["right"].includes(index)
                                        ? 0
                                        : Math.min(1, state.attn_vals[row_index][index] / rem_attn);
                                })
                            })
                        }

                        state.cur_attn = new_attn;
                    }
                    config.attention[config.filter].attn = [[state.cur_attn]];
                    renderVis();
                });

                tokenContainer.on("mouseover", function (this: any, e: Event, d: string) {
                    const select = tokenContainer.nodes();
                    const index = select.indexOf(this);

                    // Show gray background for moused-over token
                    textContainer
                        .selectAll(".background")
                        .style("opacity", function (d: any, i: number) {
                            return (i === index ? 1.0 : 0.0);
                        });

                    // Reset visibility attribute for any previously highlighted attention arcs
                    svg
                        .select("#attention")
                        .selectAll("line[visibility='visible']")
                        .attr("visibility", null);

                    // Hide group containing attention arcs
                    svg.select("#attention").attr("visibility", "hidden");
                    // Set to visible appropriate attention arcs to be highlighted
                    if (isLeft) {
                        svg
                            .select("#attention")
                            .selectAll("line[left-token-index='" + index + "']")
                            .attr("visibility", "visible");
                    } else {
                        svg
                            .select("#attention")
                            .selectAll("line[right-token-index='" + index + "']")
                            .attr("visibility", "visible");
                    }

                    // Update color boxes superimposed over tokens
                    const id = isLeft ? "right" : "left";
                    const leftPos = isLeft ? MATRIX_WIDTH + BOXWIDTH : 0;
                    svg
                        .select("#" + id)
                        .selectAll(".attentionBoxes")
                        .selectAll("g")
                        .attr("head-index", (d: any, i: number) => i)
                        .selectAll("rect")
                        .attr("x", function (this: any) {
                            const headIndex = +this.parentNode.getAttribute("head-index");
                            return leftPos + boxOffsets(headIndex);
                        })
                        .attr("y", (d: any, i: number) => TEXT_TOP + i * BOXHEIGHT)
                        .attr("width", BOXWIDTH / activeHeads())
                        .attr("height", BOXHEIGHT)
                        .style("opacity", function (this: any, d: any) {
                            const headIndex = +this.parentNode.getAttribute("head-index");
                            if (config.headVis[headIndex])
                                if (d) {
                                    return d[index];
                                } else {
                                    return 0.0;
                                }
                            else return 0.0;
                        });
                });

                textContainer.on("mouseleave", function (this: any) {
                    // Unhighlight selected token
                    d3.select(this).selectAll(".background").style("opacity", 0.0);

                    // Reset visibility attributes for previously selected lines
                    svg
                        .select("#attention")
                        .selectAll("line[visibility='visible']")
                        .attr("visibility", null);

                    svg.select("#attention").attr("visibility", "visible");

                    // Reset highlights superimposed over tokens
                    svg
                        .selectAll(".attentionBoxes")
                        .selectAll("g")
                        .selectAll("rect")
                        .style("opacity", 0.0);
                });
            }

            function renderAttention(svg: any, attention: any) {
                // Remove previous dom elements
                svg.select("#attention").remove();

                // Add new elements
                svg
                    .append("g")
                    .attr("id", "attention") // Container for all attention arcs
                    .selectAll(".headAttention")
                    .data(attention)
                    .enter()
                    .append("g")
                    .classed("headAttention", true) // Group attention arcs by head
                    .attr("head-index", (d: any, i: number) => i)
                    .selectAll(".tokenAttention")
                    .data((d: any) => d)
                    .enter()
                    .append("g")
                    .classed("tokenAttention", true) // Group attention arcs by left token
                    .attr("left-token-index", (d: any, i: number) => i)
                    .selectAll("line")
                    .data((d: any) => d)
                    .enter()
                    .append("line")
                    .attr("x1", BOXWIDTH)
                    .attr("y1", function (this: any) {
                        const leftTokenIndex =
                            +this.parentNode.getAttribute("left-token-index");
                        return TEXT_TOP + leftTokenIndex * BOXHEIGHT + BOXHEIGHT / 2;
                    })
                    .attr("x2", BOXWIDTH + MATRIX_WIDTH)
                    .attr(
                        "y2",
                        (d: any, rightTokenIndex: number) =>
                            TEXT_TOP + rightTokenIndex * BOXHEIGHT + BOXHEIGHT / 2
                    )
                    .attr("stroke-width", 2)
                    .attr("stroke", function () {
                        // const headIndex =
                        //   +this.parentNode.parentNode.getAttribute("head-index");
                        // return headColors(headIndex);
                        return "url(#svgGradient)";
                    })
                    .attr("left-token-index", function (this: any) {
                        return +this.parentNode.getAttribute("left-token-index");
                    })
                    .attr("right-token-index", (d: any, i: number) => i);
                updateAttention(svg);
            }

            function updateAttention(svg: any) {
                svg
                    .select("#attention")
                    .selectAll("line")
                    .attr("stroke-opacity", function (this: any, d: any) {
                        const headIndex =
                            +this.parentNode.parentNode.getAttribute("head-index");
                        // If head is selected
                        if (config.headVis[headIndex]) {
                            // Set opacity to attention weight divided by number of active heads
                            return d / activeHeads();
                        } else {
                            return 0.0;
                        }
                    });
            }

            function boxOffsets(i: number) {
                const numHeadsAbove = config.headVis.reduce(function (acc: number, val: number, cur: number) {
                    return val && cur < i ? acc + 1 : acc;
                }, 0);
                return numHeadsAbove * (BOXWIDTH / activeHeads());
            }

            function activeHeads() {
                return config.headVis.reduce(function (acc: number, val: number) {
                    return val ? acc + 1 : acc;
                }, 0);
            }

            function transpose(mat: any) {
                return mat[0].map(function (col: any, i: number) {
                    return mat.map(function (row: any) {
                        return row[i];
                    });
                });
            };

        }

        const clearAttn = () => {
            state.showAttn = false;
            state.attnMsg = state.mode == "single"
                ? "click a point to explore its attention"
                : "click a plot to zoom in";
            store.commit("setHighlightedTokenIndices", []);
        }

        const resetAttn = () => {
            state.hideFirst = false;
            state.hideLast = false;
            state.hidden["left"] = [];
            state.hidden["right"] = [];
            bertviz();
        }

        const hideTokens = (type: string) => {
            // filter out first/cls/sep tokens
            const tokenContainers = d3.select("#main-svg #right .attentionBoxes + g");
            let selectedToken;
            if (type == "first") {
                selectedToken = tokenContainers.selectChild(":first-child");
            } else {
                selectedToken = tokenContainers.selectChild(":last-child");
            }
            selectedToken.dispatch("click");
        }

        watch(
            () => [state.attentionByToken],
            () => {
                // draw attention plot
                state.showAttn = true;
                state.attnMsg = "click a token to toggle lines off/on";
                bertviz();
            }
        );

        watch(
            () => [state.view, state.mode],
            () => {
                if (state.view != 'attn') {
                    state.showAttn = false;
                    state.attnMsg = state.mode == "single"
                        ? "click a point to explore its attention"
                        : "click a plot to zoom in";
                }
            }
        )

        return {
            ...toRefs(state),
            clearAttn,
            bertviz,
            hideTokens,
            resetAttn
        };
    },
};
</script>

<style lang="scss">
.viewHead {
    margin-left: 10px;
    margin-top: 10px;
    background-color: transparent !important;
}

.align-top {
    align-items: baseline;
    display: flex;
    justify-content: space-between;
}

.align-top p {
    margin-bottom: 0 !important;
}

.attn-btns span {
    margin: 0 2px;
}

#attn-clear,
#attn-reset {
    position: relative;
    padding: 0;
    height: auto;
    display: inline-block;
}

.subtitle {
    font-family: monospace;
    font-size: small;
}

#bertviz {
    margin-top: 15px !important;
}

#bertviz,
#vis {
    width: fit-content !important;
    display: inline-block;
    background-color: transparent !important;
}

#vis {
    overflow-y: scroll;
    max-height: calc(100vh - 100px);
    padding-bottom: 100px;
}

// hide scrollbar but still allow scroll
#vis::-webkit-scrollbar {
    width: 0 !important;
}

#vis.element {
    overflow: -moz-scrollbars-none;
}

#main-svg {
    width: auto !important;
}

text.bold {
    font-weight: bold;
}

text.bold.query {
    fill: var(--query-label);
}

text.bold.key {
    fill: var(--key-label);
}

.token-text {
    fill: var(--text);
}

.background {
    fill: var(--token-hover);
}

.hide {
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
}
</style>
