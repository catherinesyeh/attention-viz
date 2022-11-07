// save some variables
var id = $(".plotly-graph-div").first().attr("id");
var myPlot = document.getElementById(id);
myPlot.classList.add("loading");

var search_contain = $("#search");
var search = $("#search-text");
var clear_input = $("#clear");
var results = $("#results-count");
var reset = $("#reset");
var reset_cluster = $("#reset-cluster");

var hov_template = "<b style='font-size:larger'>%{customdata[0]} (<i style='color:%{customdata[5]}'>%{customdata[4]}</i>, pos: %{customdata[2]} of %{customdata[3]}, norm: %{customdata[6]})</b><br><br>%{customdata[1]}";

// preset styles
var style_1 = {
    marker: {
        color: myPlot.data[0].marker.color,
        size: 6,
        opacity: myPlot.data[0].marker.opacity,
        coloraxis: "coloraxis"
    },
    hoverinfo: 'text',
    hovertemplate: hov_template
}

var style_2 = {
    marker: {
        color: myPlot.data[1].marker.color,
        size: 6,
        opacity: myPlot.data[1].marker.opacity,
        coloraxis: "coloraxis2"
    },
    hoverinfo: 'text',
    hovertemplate: hov_template
}

var update = {
    marker: {
        opacity: 0.05,
        color: myPlot.data[0].marker.color,
        coloraxis: "coloraxis"
    },
    hoverinfo: 'skip',
    hovertemplate: null
}

var update2 = {
    marker: {
        opacity: 0.05,
        color: myPlot.data[1].marker.color,
        coloraxis: "coloraxis2"
    },
    hoverinfo: 'skip',
    hovertemplate: null
}

function reset_plot() {
    while (myPlot.data.length > 2) { // delete top trace
        Plotly.deleteTraces(myPlot, -1);
    }
    // reset main traces
    Plotly.restyle(myPlot, style_1, [0]);
    Plotly.restyle(myPlot, style_2, [1]);
    Plotly.relayout(myPlot, { annotations: [] }); // remove annotations
}

// search by keyword and highlight matching points
function filterBySearch(search) {
    // search for points
    let val = search.val();

    if (val != "" && val != " ") {
        myPlot.classList.add("loading");
        reset_plot();
        // Plotly.relayout(myPlot, { dragmode: "zoom", selections: [] });
        results.removeClass("hide");
        results.removeClass("done");
        results.html("...");
        clear_input.removeClass('hide');
        val = val.toLowerCase();
    } else {
        clear_input.addClass('hide');
        results.addClass("hide");
        myPlot.classList.remove("loading");
        return;
    }

    setTimeout(() => {
        let data = myPlot.data;

        let found = {
            type: 'scatter',
            mode: 'markers',
            showlegend: false,
            marker: {
                color: [],
                size: 10,
                line: { width: 2, color: 'black' },
                symbol: 'star'
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

        let expr = new RegExp(val, "gi");
        const trace_colors = ["rgb(151, 73, 96)", "rgb(58, 107, 109)"];
        let num_traces = 2;
        for (let trace = 0; trace < num_traces; trace++) {
            data[trace].customdata.filter((e, i) => {
                if (expr.test(e[0])) {
                    found.marker.color.push(trace_colors[trace]);
                    found.x.push(data[trace].x[i]);
                    found.y.push(data[trace].y[i]);
                    found.customdata.push(e);
                }
            });
        }
        if (found && found.x.length != 0) {
            Plotly.restyle(myPlot, update, [0]);
            Plotly.restyle(myPlot, update2, [1]);
            Plotly.addTraces(myPlot, found);
        }
        results.removeClass("hide");
        clear_input.removeClass('hide');
        results.html(found.x.length + " results found");
        results.addClass("done");
        myPlot.classList.remove("loading");
    }, 100);
}

function show_attention(data, point_num) {
    myPlot.classList.add("loading");
    reset_plot();
    // Plotly.relayout(myPlot, { dragmode: "zoom", selections: [] });
    results.removeClass("hide");
    results.removeClass("done");
    results.html("...");
    search_contain.fadeOut();

    setTimeout(() => {
        let same_sent;
        let len;
        let max_ind;

        let pn = data.points[0].pointNumber;
        let tn = data.points[0].curveNumber;
        let cust_data = data.points[0].customdata;

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
        let start = pn - pos;
        let end = start + len;
        let all_data = myPlot.data[trace];
        let old_data = myPlot.data[tn];
        let new_x = all_data.x.slice(start, end);
        new_x.push(old_data.x[pn]); // add clicked on point too
        let new_y = all_data.y.slice(start, end);
        new_y.push(old_data.y[pn]);
        let new_cust = all_data.customdata.slice(start, end);
        new_cust.push(cust_data);

        let symbols = Array(len).fill("circle");
        max_ind = attn.indexOf(max_attn);
        // symbols[max_ind] = "star";
        symbols.push("star");

        let colors = Array(len).fill("rgb(247, 185, 86)");
        colors.push("black");

        attn = attn.map(i => i.toFixed(2));

        same_sent = {
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

        Plotly.restyle(myPlot, update, [0]);
        Plotly.restyle(myPlot, update2, [1]);
        Plotly.addTraces(myPlot, same_sent);

        // hover largest over pair with largest attention
        setTimeout(() => {
            Plotly.Fx.hover(myPlot, [{ curveNumber: 2, pointNumber: len }, { curveNumber: 2, pointNumber: max_ind }]);
        }, 100);
        search_contain.fadeOut();
        reset.fadeIn();
        results.addClass("hide");
        myPlot.classList.remove("loading");
    }, 100);
}

function highlight_cluster(data) {
    if (!data) { // nothing selected
        return;
    }

    results.html("...");
    reset_plot();
    results.removeClass("hide");
    results.removeClass("done");
    search_contain.fadeOut();
    myPlot.classList.add("loading");

    setTimeout(() => {
        reset.fadeOut();
        // search_contain.fadeIn();
        // search.val("");
        // clear_input.addClass('hide');

        // show words in cluster on select
        const clicked = data.points;

        let annotations = [];
        let unique_words = {};

        clicked.forEach(function (pt) {
            let word = pt.customdata[0];
            let annotation = {
                // add annotation for each point in cluster
                x: pt.x,
                y: pt.y,
                text: word,
                font: {
                    color: 'black',
                    size: 10
                },
                arrowcolor: 'black',
                arrowwidth: 0.1,
                opacity: 0.5
            }
            if (!(word in unique_words)) {
                unique_words[word] = annotations.length;
            }

            annotations.push(annotation);
        });

        // emphasize first instance of each token
        for (word in unique_words) {
            let index = unique_words[word];
            annotations[index].opacity = 1;
            annotations[index].font.size = 14;
        }

        let update = {
            annotations: annotations
        }
        Plotly.relayout(myPlot, update);

        results.addClass("hide");
        reset_cluster.fadeIn();
        myPlot.classList.remove("loading");
    }, 100);
}

$(document).ready(function () { // on load
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
        results.html("...");
        results.removeClass("hide");
        results.removeClass("done");
        myPlot.classList.add("loading");

        reset_plot();

        setTimeout(() => {
            $(this).addClass("hide");
            search.val("");
            results.addClass("hide");
            myPlot.classList.remove("loading");
        }, 100);
    })

    reset.click(function () { // remove attention annotations on reset
        results.html("...");
        results.removeClass("hide");
        results.removeClass("done");
        myPlot.classList.add("loading");
        $(this).fadeOut();

        reset_plot();

        setTimeout(() => {
            $(this).removeAttr("pn");
            $(this).removeData("data");
            search.val("");
            clear_input.addClass("hide");
            results.addClass("hide");
            search_contain.fadeIn();
            myPlot.classList.remove("loading");
        }, 100);
    })

    reset_cluster.click(function () {
        results.html("...");
        results.removeClass("hide");
        results.removeClass("done");
        $(this).fadeOut();
        myPlot.classList.add("loading");

        reset_plot();
        Plotly.relayout(myPlot, { dragmode: "zoom", selections: [] });

        setTimeout(() => {
            search.val("");
            clear_input.addClass("hide");
            results.addClass("hide");
            search_contain.fadeIn();
            $(this).fadeOut();
            myPlot.classList.remove("loading");
        }, 100);
    })

    if (reset.attr("style") != "display: none;" && reset.data("data")) {
        // attention info active
        show_attention(reset.data("data"), reset.attr("pn"));
    } else {
        // search active
        filterBySearch(search);
    }
})