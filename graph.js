// save some variables
var id = $(".plotly-graph-div").first().attr("id");
var myPlot = document.getElementById(id);
myPlot.classList.add("loading");

var search_contain = $("#search");
var search = $("#search-text");
var clear_input = $("#clear");
var results = $("#results-count");
var reset = $("#reset");

var hov_template = "<b style='font-size:larger'>%{customdata[0]} (<i style='color:%{customdata[5]}'>%{customdata[4]}</i>, pos: %{customdata[2]} of %{customdata[3]})</b><br><br>%{customdata[1]}";

//console.log(myPlot.data);

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
    if (myPlot.data.length == 3) { // delete top trace
        Plotly.deleteTraces(myPlot, -1);
    }
    // reset main traces
    Plotly.restyle(myPlot, style_1, [0]);
    Plotly.restyle(myPlot, style_2, [1]);
}

// search by keyword and highlight matching points
function filterBySearch(search) {
    // search for points
    let val = search.val();

    if (val != "" && val != " ") {
        myPlot.classList.add("loading");
        results.removeClass("hide");
        results.removeClass("done");
        results.html("...");
        clear_input.removeClass('hide');
        val = val.toLowerCase();
        reset_plot();
    } else {
        clear_input.addClass('hide');
        results.addClass("hide");
        myPlot.classList.remove("loading");
        return;
    }

    setTimeout(() => {
        let data = myPlot.data;
        let num_traces = data.length;

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
        results.html(found.x.length + " results found");
        results.addClass("done");
        myPlot.classList.remove("loading");
    }, 100);
}

function show_attention(data, trace) {
    console.log(myPlot.data);
    console.log(data);
    console.log(trace);

    // if (reset.attr("pn") && reset.attr("pn") == pn && !redraw) {
    //     return;
    // } else if (reset.attr("pn") && reset.attr("pn") == pn && tn != 2) {
    //     reset.attr("pn") = pn; // save new pn
    //     reset.data("attn", data); // save new data
    // }

    myPlot.classList.add("loading");

    setTimeout(() => {
        search_contain.fadeOut();
        reset_plot();

        if (data) {
            let pn = data.points[0].pointNumber;
            let tn = data.points[0].curveNumber;
            let cust_data = data.points[0].customdata;

            if (tn == 2) {
                // in search mode
                token_type = cust_data[4];
                tn = (token_type == "query") ? 1 : 0;
                console.log(cust_data);
                pn = myPlot.data[tn].customdata.indexOf(cust_data);
                // if (pn_try != -1) {
                //     pn = pn_try;
                //     reset.attr("pn") = pn; // save new pn
                //     reset.data("attn", data); // save new data
                // }
            }

            console.log(tn);
            console.log(pn);

            let offset = myPlot.data[0].x.length;
            let trace = (tn == 0) ? 1 : 0; // find other trace

            // info about this point
            let attn = attention[pn + (trace * offset)];
            let len = attn.length;
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
            let x_data = myPlot.data[trace].x;
            console.log(start);
            console.log(end);
            console.log(x_data);
            console.log(x_data.slice(start, end));
            console.log(x_data[start]);
            console.log(x_data[end]);
            let new_x = myPlot.data[trace].x.slice(start, end);
            console.log(new_x.length);
            new_x.push(data.points[0].x); // add clicked on point too
            console.log(new_x.length);
            let new_y = myPlot.data[trace].y.slice(start, end);
            console.log(new_y.length);
            new_y.push(data.points[0].y);
            console.log(new_y.length);
            let new_cust = myPlot.data[trace].customdata.slice(start, end);
            new_cust.push(cust_data);

            let symbols = Array(len).fill("circle");
            let max_ind = attn.indexOf(max_attn);
            symbols[max_ind] = "star";
            symbols.push("star");

            let colors = Array(len).fill("rgb(247, 185, 86)");
            colors.push("black");

            attn = attn.map(i => i.toFixed(2));

            let same_sent = {
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

            reset.data("trace", same_sent);
        } else {
            same_sent = trace;
        }

        Plotly.restyle(myPlot, update, [0]);
        Plotly.restyle(myPlot, update2, [1]);
        Plotly.addTraces(myPlot, same_sent);

        console.log(myPlot.data);

        // hover largest over pair with largest attention
        Plotly.Fx.hover(myPlot, [{ curveNumber: 2, pointNumber: len }, { curveNumber: 2, pointNumber: max_ind }]);
        reset.fadeIn();
        myPlot.classList.remove("loading");
    }, 100);
}

$(document).ready(function () { // on load
    myPlot.on('plotly_click', function (data) { // show attention info on click
        show_attention(data, false);
    });

    search.change(function () {
        filterBySearch($(this));
    })

    clear_input.click(function () {
        results.html("...");
        results.removeClass("hide");
        results.removeClass("done");
        myPlot.classList.add("loading");

        setTimeout(() => {
            reset_plot();

            $(this).addClass("hide");
            search.val("");
            results.addClass("hide");
            myPlot.classList.remove("loading");
        }, 100);
    })

    reset.click(function () { // remove attention annotations on reset
        myPlot.classList.add("loading");
        $(this).fadeOut();

        setTimeout(() => {
            reset_plot();
            $(this).removeAttr("pn");
            search.val("");
            clear_input.addClass("hide");
            results.addClass("hide");
            search_contain.fadeIn();
            myPlot.classList.remove("loading");
        }, 100);
    })

    if (reset.attr("style") != "display: none;" && reset.data("trace")) {
        // attention info active
        show_attention(false, reset.data("trace"));
        //reset.trigger("click");
    } else {
        // search active
        filterBySearch(search);
    }
})