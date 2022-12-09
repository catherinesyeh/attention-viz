<template>
    <div class="viewHead">
        <p>sentence view</p>
        <div id="bertviz">
            <div id="vis"></div>
        </div>
    </div>
    <!-- {{ attentionByToken }} -->
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
        });

        // start bertviz
        const bertviz = () => {
            // parse info from data
            let { attentionByToken } = state;
            let attn_vals: number[][] = attentionByToken.attns;
            const token_type: string = attentionByToken.token.type;
            const token_pos: number = attentionByToken.token.pos_int;
            const token_text: string[] = attentionByToken.token.sentence.split(" ");
            if (token_type == "key") { // flip graph if key
                attn_vals = transpose(attn_vals);
            }

            const params = {
                attention: [
                    {
                        name: null,
                        attn: [[attn_vals]],
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

            let headColors = d3.scaleOrdinal(d3.schemePastel1);
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
                    .attr("gradientTransform", "rotate(-15)");

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
                    .attr("fill", "lightgray")
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
                    const index = select.indexOf(this);
                    let hidden = d3.select(this).classed("clicked");
                    d3.select(this).classed("clicked", !hidden);
                    if (isLeft) {
                        let selected = svg
                            .select("#attention")
                            .selectAll("line[left-token-index='" + index + "']");
                        selected.classed("hide", !hidden);
                    } else {
                        let selected = svg
                            .select("#attention")
                            .selectAll("line[right-token-index='" + index + "']");
                        selected.classed("hide", !hidden);
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

            function lighten(color: any) {
                const c = d3.hsl(color);
                const increment = (1 - c.l) * 0.6;
                c.l += increment;
                c.s -= increment;
                return c;
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
            () => state.attentionByToken,
            () => {
                // draw attention plot
                bertviz();
            }
        );

        return {
            ...toRefs(state),
        };
    },
};
</script>
  
<style lang="scss">
$query-darker: #54943d;
$key-darker: #c15b7d;

.viewHead {
    margin-left: 10px;
    margin-top: 10px;
}

#bertviz,
#vis {
    width: fit-content !important;
    display: inline-block;
}

#main-svg {
    width: auto !important;
}

text.bold {
    font-weight: bold;
}

text.bold.query {
    fill: $query-darker;
}

text.bold.key {
    fill: $key-darker;
}

.hide {
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
}
</style>
  