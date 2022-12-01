// save some variables
var id = $(".plotly-graph-div").first().attr("id");
var myPlot = document.getElementById(id);

var g = $("#graph");
var search_contain = $("#search");
var search = $("#search-text");
var clear_input = $("#clear");
var results = $("#results-count");
var reset = $("#reset");
var reset_cluster = $("#reset-cluster");
var legend_title = $(".cbcoloraxis .hycbcoloraxistitle");
legend_title.attr("title", "toggle legend");

var hov_template = "<b style='font-size:larger'><span style='color:%{customdata[5]}'>%{customdata[0]}</span> (<i>%{customdata[4]}</i>, pos: %{customdata[2]} of %{customdata[3]}, norm: %{customdata[6]})</b><br><br>%{customdata[1]}";

var marker_opacity = myPlot.data[0].marker.opacity;
var color_1 = myPlot.data[0].marker.color;
var color_2 = myPlot.data[1].marker.color;

var norm_color_1 = myPlot.data[0].customdata.map(x => x[6]);
var norm_color_2 = myPlot.data[1].customdata.map(x => x[6]);

var tsne_key_x = myPlot.data[0].x;
var tsne_key_y = myPlot.data[0].y;
var tsne_query_x = myPlot.data[1].x;
var tsne_query_y = myPlot.data[1].y;

// special chars for regex that need to be replaced
var special_chars = ['.', '+', '*', '?', '^', '$', '(', ')', '[', ']', '{', '}', '|', '\\'];

// colors for points
var trace_colors = ["rgb(151, 73, 96)", "rgb(58, 107, 109)"];
var trace_colors_light = ["#FBD9B9", "#BFE5C0"];

// preset styles
var style_1 = {
    marker: {
        color: color_1,
        size: 6,
        opacity: marker_opacity,
        coloraxis: "coloraxis"
    },
}

var style_2 = {
    marker: {
        color: color_2,
        size: 6,
        opacity: marker_opacity,
        coloraxis: "coloraxis2"
    },
}

var update = {
    marker: {
        opacity: 0.1,
        color: color_1,
        coloraxis: "coloraxis"
    },
}

var update2 = {
    marker: {
        opacity: 0.1,
        color: color_2,
        coloraxis: "coloraxis2"
    },
}

var colorbar_style = {
    coloraxis: {
        colorbar: {
            title: {
                text: "normalized position",
                side: "right"
            },
            x: myPlot.layout.coloraxis.colorbar.x,
            y: myPlot.layout.coloraxis.colorbar.y
        },
        colorscale: myPlot.layout.coloraxis.colorscale,
    }
}

var relayout_short = {
    xaxis: {
        autorange: true,
        title: {
            text: '0'
        }
    },
    yaxis: {
        autorange: true,
        title: {
            text: '1'
        }
    }
}

var relayout_long = {
    dragmode: "zoom",
    selections: [],
    xaxis: {
        autorange: true,
        title: {
            text: '0'
        }
    },
    yaxis: {
        autorange: true,
        title: {
            text: '1'
        }
    }
}

var top_attention = { max: 0, x: [], y: [], x_u: [], y_u: [], customdata: [] };
function find_top_attention() { // get points with highest attention
    const filtered = attention.reduce(function (acc, curr, index) {
        // filter attention array by those with highest attention
        let max = Math.max(...curr);
        if (max >= 0.2) {
            acc.push(index);
        }
        if (max > top_attention.max) { // keep track of max too
            top_attention.max = max;
        }
        return acc;
    }, []);

    const offset = myPlot.data[0].x.length;
    for (let i = 0; i < filtered.length; i++) {
        let f = filtered[i];
        let x, y, x_u, y_u, cust_data;
        if (f >= offset) { // key
            let ind = f - offset;
            x = myPlot.data[0].x[ind];
            x_u = key_x[ind]; // push umap coords too
            y = myPlot.data[0].y[ind];
            y_u = key_y[ind];
            cust_data = myPlot.data[0].customdata[ind];
        } else { // query
            x = myPlot.data[1].x[f];
            x_u = query_x[f];
            y = myPlot.data[1].y[f];
            y_u = query_y[f];
            cust_data = myPlot.data[1].customdata[f];
        }
        top_attention.x.push(x);
        top_attention.x_u.push(x_u);
        top_attention.y.push(y);
        top_attention.y_u.push(y_u);
        top_attention.customdata.push(cust_data);
    }
}

function reset_plot() {
    while (myPlot.data.length > 2) { // delete top trace
        Plotly.deleteTraces(myPlot, -1);
    }
    // reset main traces
    restyle_helper(style_1, style_2);
    Plotly.relayout(myPlot, {
        annotations: [],
    }); // remove annotations
}

function clear_att_plot() { // clear single attention view
    attn_view.data("attn", []);
    attn_view.data("cd", []);
    $("#attn-update").click();
}

function mini_reset() {
    // reset state of interface
    myPlot.classList.add("loading");
    reset_plot();
    results.removeClass("hide");
    results.removeClass("done");
    results.html("...");
}

function finish_loading() { // done loading new view
    results.addClass("hide");
    myPlot.classList.remove("loading");
}

function load_and_opacity() { // wrapper function
    finish_loading();
    reset_opacity();
}

function restyle_helper(style1, style2) { // restyle key + query traces
    Plotly.restyle(myPlot, style1, [0]);
    Plotly.restyle(myPlot, style2, [1]);
}

function reset_to_search() { // reset back to search mode
    search_contain.fadeIn();
    search.val("");
    clear_input.addClass('hide');
    reset_cluster.fadeOut();
    reset.fadeOut();
}

function reset_and_opacity() { // wrapper function
    reset_to_search();
    load_and_opacity();
}

function remove_data() { // clear attention data for switching b/t plots
    reset.removeData("data");
    reset.removeAttr("pn");
}

// search by keyword and highlight matching points
function filterBySearch(search) {
    // search for points
    let val = search.val();

    if (val != "" && val != " ") {
        mini_reset();
        clear_input.removeClass('hide');
        attn_filter.html("show tokens with attention &ge; 0.2");
        val = val.toLowerCase();
    } else {
        search_contain.fadeIn();
        clear_input.addClass('hide');
        load_and_opacity();
        return;
    }

    Plotly.relayout(myPlot, relayout_long);
    setTimeout(() => {
        let data = myPlot.data;

        let found = { // new styling
            type: 'scatter',
            mode: 'markers',
            showlegend: false,
            marker: {
                color: [],
                size: 10,
                line: { width: 2, color: [] },
                symbol: 'circle'
            },
            xaxis: 'x',
            yaxis: 'y',
            legendgroup: '',
            name: '',
            x: [],
            y: [],
            customdata: [],
            hovertemplate: hov_template,
        };

        if (special_chars.includes(val)) { // make sure regex is valid later
            val = '\\' + val;
        }
        let expr = new RegExp(val, "gi");
        let num_traces = 2;
        for (let trace = 0; trace < num_traces; trace++) {
            data[trace].customdata.filter((e, i) => {
                if (expr.test(e[0])) {
                    found.marker.color.push(trace_colors_light[trace]);
                    found.marker.line.color.push(trace_colors[trace])
                    found.x.push(data[trace].x[i]);
                    found.y.push(data[trace].y[i]);
                    found.customdata.push(e);
                }
            });
        }
        if (found && found.x.length != 0) {
            restyle_helper(update, update2);
            Plotly.addTraces(myPlot, found);
        } else {
            reset_opacity();
        }
        clear_input.removeClass('hide');
        results.html(found.x.length + " results found");
        results.addClass("done");
        myPlot.classList.remove("loading");
    }, 150);
}

function show_attention(data, point_num) { // show attention info when click on a point
    mini_reset();
    reset_cluster.fadeOut();
    attn_filter.html("show tokens with attention &ge; 0.2");
    search_contain.fadeOut();

    Plotly.relayout(myPlot, relayout_long);

    setTimeout(() => {
        let same_sent;
        let len;
        // let max_ind;

        let pn = data.points[0].pointNumber;
        let tn = data.points[0].curveNumber;
        let cust_data = data.points[0].customdata;

        // if (!cust_data) {
        //     // have to find it
        //     cust_data = myPlot.data[tn].customdata[pn];
        // }

        if (tn > 1) {
            // attention mode already activated
            token_type = cust_data[4];
            tn = (token_type == "query") ? 1 : 0;
            pn = point_num ? parseInt(point_num) : myPlot.data[tn].customdata.indexOf(cust_data);

        }

        let offset = myPlot.data[0].x.length;
        let trace = (tn == 0) ? 1 : 0; // find other trace

        // info about this point
        let attn = attention[pn + (trace * offset)];
        len = attn.length;
        let pos = cust_data[2] - 1;
        let start = pn - pos;
        let end = start + len;

        // get all attn in sentence
        let all_attn = attention.slice(start, end);

        // normalize attn values as size of data points (b/t 6 - 16)
        let min_attn = Math.min(...attn);
        let max_attn = Math.max(...attn);
        let range = max_attn - min_attn;
        let norm_size = [];
        for (let i = 0; i < len; i++) {
            let norm_attn = (((attn[i] - min_attn) / range) * 10) + 6;
            norm_size.push(norm_attn);
        }
        norm_size.push(16);

        // other tokens of opp type in sentence
        let all_data = myPlot.data[trace];
        let old_data = myPlot.data[tn];
        let new_x = all_data.x.slice(start, end);
        new_x.push(old_data.x[pn]); // add clicked on point too
        let new_y = all_data.y.slice(start, end);
        new_y.push(old_data.y[pn]);
        let new_cust = all_data.customdata.slice(start, end);

        let attn_tokens = new_cust.map(i => i[0]); // get all tokens
        console.log(attn_tokens);
        attn_view.data("attn", all_attn); // store data
        attn_view.data("cd", attn_tokens);
        attn_view.data("pos", cust_data[2] - 1);
        attn_view.data("side", (tn == 1) ? "left" : "right");
        // attn_view.data("start", start);
        new_cust.push(cust_data); // add clicked on point too

        let symbols = Array(len).fill("circle");
        max_ind = attn.indexOf(max_attn);
        // symbols[max_ind] = "star";
        symbols.push("star");

        let colors = Array(len).fill("rgb(247, 185, 86)");
        colors.push("black");

        attn = attn.map(i => i.toFixed(2));

        same_sent = { // new styling
            type: 'scatter',
            mode: 'markers+text',
            showlegend: false,
            marker: {
                color: colors,
                size: norm_size,
                line: { width: 2, color: 'black' },
                symbol: symbols,
                opacity: 1
            },
            xaxis: 'x',
            yaxis: 'y',
            legendgroup: '',
            name: '',
            x: new_x,
            y: new_y,
            customdata: new_cust,
            hovertemplate: hov_template,
            text: attn,
            textposition: 'top center',
            textfont: {
                color: 'black'
            }
        };

        reset.data("data", data);
        reset.attr("pn", pn);

        restyle_helper(update, update2);
        Plotly.addTraces(myPlot, same_sent);

        // hover largest over pair with largest attention
        // setTimeout(() => {
        //     Plotly.Fx.hover(myPlot, [{ curveNumber: 2, pointNumber: len }, { curveNumber: 2, pointNumber: max_ind }]);
        // }, 150);
        search_contain.fadeOut();
        reset_cluster.fadeOut();
        reset.fadeIn();
        $("#attn-update").click();
        finish_loading();
    }, 150);
}

function add_to_cluster(word, unique_words, pt) { // helper for highlight cluster function
    if (!(word in unique_words)) { // new word
        unique_words[word] = {
            x: [pt.x],
            y: [pt.y],
        }
    } else { // add coords to existing lists
        unique_words[word].x.push(pt.x);
        unique_words[word].y.push(pt.y);
    }

    return unique_words;
}

function make_cluster_annotations(annotations, unique_words, trace) {
    let min_num = myPlot.data[0].customdata.length;
    let max_num = 0;
    for (word in unique_words) {
        let length = unique_words[word].x.length;
        if (length < min_num) { // found new min
            min_num = length;
        }
        if (length > max_num) { // found new max
            max_num = length;
        }
    }
    let range = max_num - min_num;

    for (word in unique_words) {
        let avg = array => array.reduce((a, b) => a + b) / array.length; const avg_x = avg(unique_words[word].x);
        const avg_y = avg(unique_words[word].y);

        let size = unique_words[word].x.length;
        let annotation = {
            // add annotation for each point in cluster
            x: avg_x,
            y: avg_y,
            text: word + " (" + parseInt(size) + ")",
            font: {
                color: trace_colors[trace],
                size: (((size - min_num) / range) * 6) + 10
            },
            arrowcolor: 'black',
            arrowwidth: 0.1,
            opacity: (((size - min_num) / range) * 0.5) + 0.5
        }
        annotations.push(annotation);
    }
    return annotations;
}

function highlight_cluster(data) { // show words in cluster when selected
    if (!data || data.points.length == 0) { // nothing selected
        return;
    }
    mini_reset();
    remove_data();
    clear_att_plot();
    search.val("");
    search_contain.fadeOut();
    attn_filter.html("show tokens with attention &ge; 0.2");

    setTimeout(() => {
        reset.fadeOut();

        // show words in cluster on select
        const clicked = data.points;

        let annotations = [];
        let unique_words = {};
        let unique_words_2 = {};

        clicked.forEach(function (pt) { // collect unique set of words
            let word = pt.customdata[0];
            let type = pt.customdata[4];
            if (type == "key") { // key
                unique_words = add_to_cluster(word, unique_words, pt);
            } else { // query
                unique_words_2 = add_to_cluster(word, unique_words_2, pt);
            }
        })

        annotations = make_cluster_annotations(annotations, unique_words, 0);
        annotations = make_cluster_annotations(annotations, unique_words_2, 1);

        let update = {
            annotations: annotations
        }
        Plotly.relayout(myPlot, update);
        reset_cluster.fadeIn();
        finish_loading();
    }, 150);
}

function switch_colors(html) { // switch coloring of graph
    if (html.includes("position")) { // switch to norm
        style_1.marker.color = norm_color_1;
        update.marker.color = norm_color_1;
        style_2.marker.color = norm_color_2;
        update2.marker.color = norm_color_2;
        colorbar_style.coloraxis.colorbar.title.text = "vector norm";
        g.addClass("norm");
    } else { // switch to position
        style_1.marker.color = color_1;
        update.marker.color = color_1;
        style_2.marker.color = color_2;
        update2.marker.color = color_2;
        colorbar_style.coloraxis.colorbar.title.text = "normalized position";
        g.removeClass("norm");
    }
    Plotly.relayout(myPlot, colorbar_style);

    if (myPlot.data.length > 2) { // update styling for current view     
        restyle_helper(update, update2);
    } else {
        restyle_helper(style_1, style_2);
        // reset_opacity();
    }
}

function initialize() { // make sure plot is set up correctly on load
    if (!reset.attr("style").includes("display: none") && reset.data("data")) {
        // attention info active
        show_attention(reset.data("data"), reset.attr("pn"));
    } else {
        // search active
        filterBySearch(search);
        reset_cluster.fadeOut();
    }

    if (g.hasClass("norm")) { // switch to norm color scale
        switch_colors("normalized position");
    }

    if (attn_filter.html().includes("reset")) { // filter view if necessary
        filter_attention("show tokens with attention &ge; 0.2");
    }
}

$(document).ready(function () { // on load
    myPlot.classList.add("loading");
    myPlot.on('plotly_click', function (data) { // show attention info on click
        show_attention(data, false);
    });

    myPlot.on('plotly_selected', function (data) { // show details of cluster on select
        highlight_cluster(data);
    })

    search.change(function () {
        filterBySearch($(this));
    })

    clear_input.click(function () {
        mini_reset();
        Plotly.relayout(myPlot, relayout_short);

        setTimeout(() => {
            $(this).addClass("hide");
            search.val("");
            load_and_opacity();
        }, 150);
    })

    reset.click(function () { // remove attention annotations on reset
        mini_reset();
        Plotly.relayout(myPlot, relayout_short);

        setTimeout(() => {
            remove_data();
            clear_att_plot();
            reset_and_opacity();
        }, 150);
    })

    reset_cluster.click(function () { // remove cluster annotations on reset
        mini_reset();
        Plotly.relayout(myPlot, relayout_long);

        setTimeout(() => {
            reset_and_opacity();
        }, 150);
    })

    legend_title.click(function () { // switch colors of plot
        let html = $(this).html();
        switch_colors(html);
    })

    myPlot.on('plotly_relayout', function (e) { // reset opacity on relayout
        if (e.dragmode) { // don't trigger change for dragmode events
            return;
        }
        setTimeout(() => {
            if (myPlot.data.length < 3 && reset_cluster.attr("style").includes("display: none")) {
                reset_opacity();
            }
        }, 150);
    });

    setTimeout(() => {
        find_top_attention();
        if (graph_type.html() == "UMAP") { // change plot type if necessary
            myPlot.data[0].x = key_x;
            myPlot.data[0].y = key_y;
            myPlot.data[1].x = query_x;
            myPlot.data[1].y = query_y;
            Plotly.redraw(myPlot);
        }
        initialize();

        myPlot.classList.remove("loading");
    }, 150);
})