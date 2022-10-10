// save variables
const layer_menu = $("#layer");
const head_menu = $("#head");
const type_menu = $("#graph-type");
const view_all = $("#view-all");
const graph = $("#graph");

const matrix = $("<div id='matrix'></div>");
const matrix_pos = $("<div id='matrix'></div>");

function load_graph(layer, head) {
    const g = $("#graph");
    g.html("<p class='emphasis loading'>loading...</p>"); // clear content + loading message
    // change graph displayed on UI
    var directory = "plots/";
    if (type_menu.val() == "position") { // switch directory based on type of graph selected
        directory = "plots_pos/";
    }
    g.load(directory + "layer" + layer + "_head" + head + ".html");
}

function load_matrix() {
    // show all graphs in matrix view
    const g = $("#graph");
    g.html(""); // clear content
    if (type_menu.val() == "type") { // load matrix based on type of graph selected
        matrix.appendTo(g);
    } else {
        matrix_pos.appendTo(g);
    }
}

function load_single_view(plot) {
    var layer = plot.attr("layer");
    var head = plot.attr("head");

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

function create_matrix(matrix, pos) {
    var directory = "plot_imgs/";
    if (pos) { // switch directory for position graphs
        directory = "plot_imgs_pos/";
    }
    // generate matrix of all plots
    var head_label = $("<p class='axis-label'><span class='head-axis'>head →</span><span class='layer-axis'>layer ↓</span></p>");
    head_label.appendTo(matrix);
    for (var i = 0; i < 12; i++) {
        // label head number across
        var head = $("<p class='head-label'>" + i + "</p>");
        head.appendTo(matrix);
    }
    for (var layer = 0; layer < 12; layer++) {
        // add layer number
        var label = $("<p class='layer-label'>" + layer + "</p>");
        label.appendTo(matrix);
        for (var head = 0; head < 12; head++) {
            // load img of each plot
            var img = $("<img class='mini-plot' />");
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
    }

    $('.mini-plot').click(function () { // when user presses plot in matrix view
        load_single_view($(this));
    })
}

$(document).ready(function () { // on load
    layer_menu.on("change", function () { // when user changes layer
        var layer = $(this).val();
        var head = head_menu.val();

        load_graph(layer, head);
    })

    head_menu.on("change", function () { // when user changes head
        var head = $(this).val();
        var layer = layer_menu.val();

        load_graph(layer, head);
    })

    type_menu.on("change", function () { // when user changes graph type
        if (!graph.hasClass("active")) {
            var layer = layer_menu.val();
            var head = head_menu.val();

            load_graph(layer, head);
        } else {
            matrix_control();
        }
    })

    view_all.click(function () { // when user presses 'view all' button
        // load matrix of all plots
        matrix_control();
    })

    create_matrix(matrix, false); // pre create matrices
    create_matrix(matrix_pos, true);
    load_graph(layer_menu.val(), head_menu.val()); // default to layer 0, head 0
});