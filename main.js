// save variables
const layer_menu = $("#layer");
const head_menu = $("#head");
const graph_type = $("#type-label");
const view_all = $("#view-all");
const graph = $("#graph");

const matrix = $("<div id='matrix'></div>");
const matrix_umap = $("<div id='matrix'></div>");

function load_graph(layer, head) {
    const g = $("#graph");
    g.html("<p class='emphasis loading'>loading...</p>"); // clear content + loading message
    // change graph displayed on UI
    let directory = "plots/";
    if (graph_type.html() == "UMAP") { // switch directory based on type of graph selected
        directory = "umap/";
    }
    g.load(directory + "layer" + layer + "_head" + head + ".html");
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
    }

    $('.mini-plot').click(function () { // when user presses plot in matrix view
        load_single_view($(this));
    })
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

    graph_type.click(function () { // when user changes graph type
        const cur_type = $(this).html();
        if (cur_type == "TSNE") {
            $(this).html("UMAP");
        } else {
            $(this).html("TSNE"); // switch type
        }

        if (!graph.hasClass("active")) { // update plots
            let layer = layer_menu.val();
            let head = head_menu.val();

            load_graph(layer, head);
        } else {
            matrix_control();
        }
    })

    view_all.click(function () { // when user presses 'view all' button
        // load matrix of all plots
        matrix_control();
        $("#reset").fadeOut(); // hide buttons
        $("#reset").removeData("data");
        $("#reset").removeAttr("pn");
        $("#results-count").addClass("hide");
        $("#reset-cluster").fadeOut(); // hide buttons
    })

    create_matrix(matrix, false); // pre create matrices
    create_matrix(matrix_umap, true);
    load_graph(layer_menu.val(), head_menu.val()); // default to layer 0, head 0
});