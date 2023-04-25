<template>
    <div class="viewHead" id="attn-map-view">
        <div class="align-top">
            <Transition>
                <p v-show="showAttn">Aggregate View<a-tooltip placement="rightTop">
                        <template #title>
                            <span>aggregate sentence-level attention patterns for this attention head</span>
                        </template>
                        <font-awesome-icon icon="info" class="info-icon first" />
                    </a-tooltip> ({{ layerHead }})
                </p>
            </Transition>
            <Transition>
                <div class="attn-btns" v-show="showAttn">
                    <a-button id="hide-agg" class="clear" type="link" @click="hideShowAgg">hide</a-button>
                </div>
            </Transition>
        </div>
        <Transition>
            <div :id="myID" class="bertviz" v-show="showAttn">
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
    props: { myID: String, otherID: String },
    setup(props: any) {
        const store = useStore();

        const state = reactive({
            attentionByToken: computed(() => store.state.attentionByToken),
            showAttn: computed(() => store.state.showAttn),
            resetAttn: computed(() => store.state.resetAttn),
            showAgg: computed(() => store.state.showAgg),
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
            weighted_attn: [] as number[][],
            hidden: { left: [] as number[], right: [] as number[] },
            hideFirst: computed(() => store.state.hideFirst),
            hideLast: computed(() => store.state.hideLast),
            weightByNorm: computed(() => store.state.weightByNorm),
        });

        // toggle agg attention view
        const hideShowAgg = () => {
            store.commit("setShowAgg", false);
        }

        // scroll helper function        
        const scrollFunction = (curElement: Element) => {
            const myScroll = curElement.scrollTop;
            const myID = curElement.id;
            const allElems = document.querySelectorAll(".bertviz:not(#" + myID + ") #vis");
            allElems.forEach((v) => { v.scrollTop = myScroll });
        }

        // helper function for renormalizing attention when a key is hidden
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

        // helper function for weighting attention by value norms
        const weightAttn = (attns: number[][]) => {
            let { attentionByToken } = state;
            const norms = attentionByToken.agg_norms;

            const new_attn = attns.map((row: number[]) => {
                // scale
                let new_row = row.map((cell: number, index: number) => {
                    return cell * norms[index];
                })
                // now renormalize 
                const row_sum = new_row.reduce((sum, elem) => sum + elem, 0);
                if (row_sum == 0) { // control for NaNs
                    return new_row;
                }
                return new_row.map((cell: number) => cell / row_sum);
            })

            return new_attn;
        }

        // start bertviz
        const bertviz = () => {
            // parse info from data
            let { attentionByToken } = state;
            state.attn_vals = attentionByToken.agg_attns;
            const token_type: string = attentionByToken.token.type;
            const token_pos: number = attentionByToken.token.pos_int;
            let token_text: string[] = attentionByToken.token.sentence.split(" ");
            token_text = token_text.map((v, i) => i.toString());

            state.cur_attn = state.attn_vals;

            state.hidden["left"] = [];
            state.hidden["right"] = [];

            // hide first/last tokens if checkboxes selected
            if (state.hideFirst) {
                state.cur_attn = hideKey(0);
                state.hidden["right"].push(0);
            }
            if (state.model == "bert" && state.hideLast) {
                // gpt doesn't have hide last option
                state.cur_attn = hideKey(token_text.length - 1);
                state.hidden["right"].push(token_text.length - 1);
            }

            if (state.attentionByToken.norms.length > 0) {
                // don't weight for bert
                state.weighted_attn = weightAttn(state.attn_vals);
                if (state.weightByNorm) {
                    state.cur_attn = weightAttn(state.cur_attn);
                }
            }

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
                root_div_id: props.myID || "my-bertviz",
                layer: 0,
                heads: [0],
                include_layers: [0],
            };

            let config: Config = initialize();
            renderVis();

            const visContain = document.querySelector(`#${config.rootDivId} #vis`);
            visContain?.addEventListener("scroll", (e) => {
                scrollFunction(e.currentTarget as Element);
            })

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
                document.querySelector(`#${config.rootDivId} #vis`)!.innerHTML = "";

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
                let selected = document.querySelectorAll(`#${config.rootDivId} #` + side + " text")[token_pos + 1];
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
                    .append("g")
                    .attr("index", (d: any, i: number) => i);

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
                    let hidden, new_attn;
                    if (isLeft) { // query
                        let hid_index = state.hidden["left"].indexOf(ind);
                        if (hid_index != -1) { // was hidden, now unhide
                            hidden = true;
                            state.hidden["left"].splice(hid_index, 1);
                        } else { // was visible, now hide
                            hidden = false;
                            state.hidden["left"].push(ind);
                        }

                        let sent_length = state.cur_attn[ind].length;
                        let attn_copy = state.cur_attn.map((a) => a.slice());
                        if (!hidden) { // hide
                            attn_copy[ind] = new Array(sent_length).fill(0);
                        } else { // show
                            const reset_to = state.weightByNorm && state.weighted_attn.length > 0 ? state.weighted_attn : state.attn_vals;
                            new_attn = state.cur_attn[ind].map((x, index) => {
                                // reset to current state (account for any tokens that are hidden on right side)
                                return reset_to[ind][index];
                            });
                            attn_copy[ind] = new_attn;
                        }
                        state.cur_attn = attn_copy;
                    } else { // key
                        if (e.isTrusted) {
                            if (ind == 0) {
                                store.commit("setHideFirst", !state.hideFirst);
                            } else if (ind == select.length - 1) {
                                store.commit("setHideLast", !state.hideLast);
                            }
                        }
                        let hid_index = state.hidden["right"].indexOf(ind);
                        if (hid_index != -1) { // was hidden, now unhide
                            hidden = true;
                            state.hidden["right"].splice(hid_index, 1);
                        } else { // was visible, now hide
                            hidden = false;
                            state.hidden["right"].push(ind);
                        }
                        if (!hidden) { // hide
                            // 0 out cells corresponding to clicked on token
                            new_attn = hideKey(ind);
                        } else { // show again
                            // add back cells corresponding to clicked on token
                            const reset_to = state.weightByNorm && state.weighted_attn.length > 0 ? state.weighted_attn : state.attn_vals;
                            new_attn = state.cur_attn.map((row: number[], index: number) => {
                                let rem_attn = 1;
                                let row_index = index;
                                state.hidden["right"].forEach((x, index) => {
                                    // account for other hidden keys too
                                    rem_attn -= reset_to[row_index][x];
                                })
                                return row.map((cell: number, index: number) => {
                                    return rem_attn == 0 || state.hidden["right"].includes(index)
                                        ? 0
                                        : Math.min(1, reset_to[row_index][index] / rem_attn);
                                })
                            })
                        }

                        state.cur_attn = new_attn;
                    }
                    config.attention[config.filter].attn = [[state.cur_attn]];
                    renderVis();

                    // update other vis too
                    if (e.isTrusted) {
                        const sideId = isLeft ? "left" : "right";
                        const selectedToken = d3.select(`#${props.otherID} #main-svg #${sideId} .attentionBoxes + g`).selectChild(`[index='${ind}']`);
                        selectedToken.dispatch("click");
                    }
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

        watch(
            () => [state.showAttn, state.weightByNorm, state.resetAttn, state.attentionByToken],
            () => {
                // draw attention plot
                if (state.showAttn || state.resetAttn) {
                    bertviz();
                    if (state.resetAttn) { // reset complete
                        store.commit("setResetAttn", false);
                    }
                }
            }
        );

        return {
            ...toRefs(state),
            hideShowAgg,
            bertviz
        };
    },
};
</script>

<style lang="scss"></style>
