// save variables
const layer_menu = $("#layer");
const head_menu = $("#head");
const graph_type = $("#type-label");
const view_all = $("#view-all");
const graph = $("#graph");
const attn_filter = $("#attn-filter");

const matrix = $("<div id='matrix'></div>");
const matrix_umap = $("<div id='matrix'></div>");

function load_graph(layer, head) {
    attn_filter.fadeOut();
    const g = $("#graph");
    g.html("<p class='emphasis loading'>loading...</p>"); // clear content + loading message

    // change graph displayed on UI
    let directory = "plots/";
    g.load(directory + "layer" + layer + "_head" + head + ".html");
    attn_filter.fadeIn();
}

function load_matrix() {
    // show all graphs in matrix view
    const g = $("#graph");
    g.html(""); // clear content
    if (graph_type.html() == "TSNE") { // load matrix based on type of graph selected
        matrix.appendTo(g);
    } else {
        matrix_umap.appendTo(g);
    }
}

function load_single_view(plot) {
    let layer = plot.attr("layer");
    let head = plot.attr("head");

    // switch back to single plot view
    graph.removeClass("active");
    layer_menu.val(layer); // switch to right layer and head
    head_menu.val(head);
    load_graph(layer_menu.val(), head_menu.val());

    // update elements accordingly
    view_all.html("view all");
    view_all.removeClass("inactive");
    $('.control').fadeIn();
}

function create_matrix(matrix, umap) {
    let directory = "plot_imgs/";
    if (umap) { // switch directory for umap
        directory = "umap_imgs/";
    }
    // generate matrix of all plots
    let head_label = $("<p class='axis-label'><span class='head-axis'>head →</span><span class='layer-axis'>layer ↓</span></p>");
    head_label.appendTo(matrix);
    for (let i = 0; i < 12; i++) {
        // label head number across
        let head = $("<p class='head-label'>" + i + "</p>");
        head.appendTo(matrix);
    }
    for (let layer = 0; layer < 12; layer++) {
        // add layer number
        let label = $("<p class='layer-label'>" + layer + "</p>");
        label.appendTo(matrix);
        for (let head = 0; head < 12; head++) {
            // load img of each plot
            let img = $("<img class='mini-plot' />");
            img.attr("src", directory + "layer" + layer + "_head" + head + ".png")
            img.attr("title", "layer " + layer + " head " + head);
            img.attr("layer", layer);
            img.attr("head", head);
            img.appendTo(matrix); // add to container
        }
    }
}

function matrix_control() { // control ui behavior when in matrix view
    load_matrix();

    if (!graph.hasClass("active")) {
        graph.addClass("active");
        view_all.addClass("inactive");
        view_all.html("click on a plot below to explore");
        $('.control').fadeOut();
        $("#search-text").val(""); // clear search
        filter_attention("reset"); // clear attention filter
    }

    $('.mini-plot').click(function () { // when user presses plot in matrix view
        load_single_view($(this));
    })
}

function filter_attention(reset_view) { // show only points with high attention
    mini_reset();
    Plotly.relayout(myPlot, relayout_long);

    if (reset_view.includes("reset")) {
        attn_filter.html("show tokens with attention &ge; 0.2");
        reset_and_opacity();
        return;
    }

    setTimeout(() => {
        let new_x = top_attention.x;
        let new_y = top_attention.y;
        if (graph_type.html() == "UMAP") { // filter active on umap
            new_x = top_attention.x_u;
            new_y = top_attention.y_u;
        }

        let new_style = {
            type: 'scatter',
            mode: 'markers+text',
            showlegend: false,
            marker: {
                color: "rgb(247, 185, 86)",
                size: 10,
                line: { width: 2, color: 'black' },
                symbol: "star",
                opacity: 1
            },
            xaxis: 'x',
            yaxis: 'y',
            legendgroup: '',
            name: '',
            x: new_x,
            y: new_y,
            customdata: top_attention.customdata,
            hovertemplate: hov_template,
        };

        restyle_helper(update, update2);
        Plotly.addTraces(myPlot, new_style);

        attn_filter.html("reset (# points: <b>" + top_attention.x.length + "</b>, max attn: <b>" + top_attention.max.toFixed(2) + "</b>)");
        reset_to_search();
        finish_loading();
    }, 100);
}

function reset_opacity() { // reset opacity of key and query traces
    $(".trace:nth-child(1) .points .point").css("opacity", marker_opacity);
    $(".trace:nth-child(2) .points .point").css("opacity", marker_opacity);
}

$(document).ready(function () { // on load
    layer_menu.on("change", function () { // when user changes layer
        let layer = $(this).val();
        let head = head_menu.val();

        load_graph(layer, head);
    })

    head_menu.on("change", function () { // when user changes head
        let head = $(this).val();
        let layer = layer_menu.val();

        load_graph(layer, head);
    })

    view_all.click(function () { // when user presses 'view all' button
        // load matrix of all plots
        matrix_control();
        remove_data();
        $("#reset").fadeOut(); // hide buttons
        $("#results-count").addClass("hide");
        $("#reset-cluster").fadeOut(); // hide buttons
    })

    graph_type.click(function () { // when user changes graph type
        const cur_type = $(this).html();
        if (cur_type == "TSNE") {
            $(this).html("UMAP");
            myPlot.data[0].x = key_x;
            myPlot.data[0].y = key_y;
            myPlot.data[1].x = query_x;
            myPlot.data[1].y = query_y;
        } else {
            $(this).html("TSNE"); // switch type
            myPlot.data[0].x = tsne_key_x;
            myPlot.data[0].y = tsne_key_y;
            myPlot.data[1].x = tsne_query_x;
            myPlot.data[1].y = tsne_query_y;
        }

        if (!graph.hasClass("active")) { // update plots
            initialize();
            Plotly.redraw(myPlot);
            if (myPlot.data.length < 3) {
                reset_opacity();
            } else if (attn_filter.html().includes("reset")) { // filter view if necessary
                filter_attention("show tokens with attention &ge; 0.2");
            }
            if (reset_cluster.attr("style") != "display: none;") {
                reset_cluster.click();
            }
        } else {
            matrix_control();
        }
    })

    attn_filter.click(function () { // filter top attention sentences
        filter_attention($(this).html());
    })

    create_matrix(matrix, false); // pre create matrices
    create_matrix(matrix_umap, true);
    load_graph(layer_menu.val(), head_menu.val()); // default to layer 0, head 0
});