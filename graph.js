// save some variables
var id = $(".plotly-graph-div").first().attr("id");
var myPlot = document.getElementById(id);

var search = $("#search-text");
var clear_input = $("#clear");

//console.log(myPlot.data);

var style_1 = {
    marker: {
        color: myPlot.data[0].marker.color,
        size: 6,
        opacity: myPlot.data[0].marker.opacity
    }
}
var style_2 = {
    marker: {
        color: myPlot.data[1].marker.color,
        size: 6,
        opacity: myPlot.data[1].marker.opacity
    }
}

// search by keyword and highlight matching points
function filterBySearch(search) {
    Plotly.restyle(myPlot, style_1, [0]);
    Plotly.restyle(myPlot, style_2, [1]);

    // search for points
    var val = search.val();

    if (val != "" && val != " ") {
        clear_input.removeClass('hide');
    } else {
        clear_input.addClass('hide');
        return;
    }
    var data = myPlot.data;
    var found = false;
    var update = {
        marker: {
            color: Array(data[0].x.length).fill(style_1.marker.color),
            size: Array(data[0].x.length).fill(6),
            opacity: Array(data[0].x.length).fill(0.1)
        }
    };
    var update2 = {
        marker: {
            color: Array(data[1].x.length).fill(style_2.marker.color),
            size: Array(data[1].x.length).fill(6),
            opacity: Array(data[1].x.length).fill(0.1)
        }
    };
    for (var trace = 0; trace < data.length; trace++) {
        var num_points = data[trace].x.length;
        var offset = trace * num_points;
        for (var point = 0; point < num_points; point++) {
            if (data[trace].customdata[point + offset][0].toLowerCase().includes(val.toLowerCase())) {
                //found.push({ curveNumber: trace, pointNumber: point });
                found = true;
                if (trace == 0) { // query
                    update.marker.opacity[point] = 1;
                    update.marker.size[point] = 10;
                    update.marker.color[point] = 'black';
                } else { // key
                    update2.marker.opacity[point] = 1;
                    update2.marker.size[point] = 10;
                    update2.marker.color[point] = 'black';
                }
            }
        }
    }

    if (found) { // restyle only if keyword found
        Plotly.restyle(myPlot, update, [0]);
        Plotly.restyle(myPlot, update2, [1]);
    }
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
        Plotly.restyle(myPlot, style_1, [0]);
        Plotly.restyle(myPlot, style_2, [1]);
        $(this).addClass("hide");
        search.val("");
    })

    filterBySearch(search);

    //Plotly.Fx.hover(myPlot, [{ curveNumber: 0, pointNumber: 200 }, { curveNumber: 1, pointNumber: 14 }]);
})