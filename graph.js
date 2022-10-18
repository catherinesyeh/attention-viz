// save some variables
var id = $(".plotly-graph-div").first().attr("id");
var myPlot = document.getElementById(id);
myPlot.classList.add("loading");

var search = $("#search-text");
var clear_input = $("#clear");
var results = $("#results-count");

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

// search by keyword and highlight matching points
function filterBySearch(search) {
    // search for points
    var val = search.val();

    if (val != "" && val != " ") {
        clear_input.removeClass('hide');
    } else {
        clear_input.addClass('hide');
        results.addClass("hide");
        myPlot.classList.remove("loading");
        return;
    }

    results.html("...");
    results.removeClass("hide");
    results.removeClass("done");
    myPlot.classList.add("loading");

    setTimeout(() => {
        var data = myPlot.data;

        if (data.length == 3) { // delete top trace
            Plotly.deleteTraces(myPlot, -1);
        }

        // reset graph first
        Plotly.restyle(myPlot, style_1, [0]);
        Plotly.restyle(myPlot, style_2, [1]);

        var found = {
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

        for (var trace = 0; trace < data.length; trace++) {
            var cur_trace = data[trace];
            var num_points = cur_trace.x.length;
            for (var point = 0; point < num_points; point++) {
                if (cur_trace.customdata[point][0].toLowerCase().includes(val.toLowerCase())) {
                    // add info to search results if keyword found
                    found.x.push(cur_trace.x[point]);
                    found.y.push(cur_trace.y[point]);
                    found.customdata.push(cur_trace.customdata[point]);

                    if (trace == 0) { // key
                        found.marker.color.push("rgb(151, 73, 96)");
                    } else { // query
                        found.marker.color.push("rgb(58, 107, 109)");
                    }
                }
            }
        }

        //console.log(found);
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

$(document).ready(function () { // on load
    //var data = myPlot.data;

    // myPlot.on('plotly_click', function (data) {
    //     console.log(data);
    //     var pn = '',
    //         tn = '',
    //         colors = [],
    //         color = '',
    //         opacities = [],
    //         sizes = [];
    //     for (var i = 0; i < data.points.length; i++) {
    //         // find point we clicked on
    //         pn = data.points[i].pointNumber;
    //         tn = data.points[i].curveNumber;
    //         opacities = Array(data.points[i].data.x.length).fill("0.1");
    //         sizes = Array(data.points[i].data.x.length).fill(6);
    //         //colors = Array(data.points[i].data.x.length).fill("#888");
    //         //color = data.points[i].data.marker.color;
    //     };
    //     // adjust styling
    //     colors[pn] = color;
    //     opacities[pn] = "1";
    //     sizes[pn] = 10;

    //     // update plot
    //     var update = { 'marker': { opacity: opacities, size: sizes } };
    //     Plotly.restyle(id, update, [tn]);
    // });

    search.change(function () {
        filterBySearch($(this));
        //console.log(myPlot.data);
    })

    clear_input.click(function () {
        results.html("...");
        results.removeClass("hide");
        results.removeClass("done");
        myPlot.classList.add("loading");

        setTimeout(() => {
            Plotly.restyle(myPlot, style_1, [0]);
            Plotly.restyle(myPlot, style_2, [1]);
            if (myPlot.data.length == 3) { // delete top trace
                Plotly.deleteTraces(myPlot, -1);
            }
            $(this).addClass("hide");
            search.val("");
            results.addClass("hide");
            myPlot.classList.remove("loading");
        }, 100);
    })

    filterBySearch(search);

    //Plotly.Fx.hover(myPlot, [{ curveNumber: 0, pointNumber: 200 }, { curveNumber: 1, pointNumber: 14 }]);
})