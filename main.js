function load_graph(layer, head) {
    const g = $("#graph");
    g.html("<p class='emphasis loading'>loading...</p>");
    // change graph displayed on UI
    g.load("plots/layer" + layer + "_head" + head + ".html");
}

function load_matrix() {
    // show all graphs in matrix view
    const g = $("#graph");
    g.html(""); // clear content
    matrix.appendTo(g); // load matrix
}

function load_single_view(plot) {
    var layer = plot.attr("layer");
    var head = plot.attr("head");
    // switch back to single plot view
    const layer_menu = $("#layer");
    const head_menu = $("#head");
    const view_all = $("#view-all");
    const graph = $("#graph");

    graph.removeClass("active");
    layer_menu.val(layer); // switch to right layer and head
    head_menu.val(head);
    load_graph(layer_menu.val(), head_menu.val());

    // update elements accordingly
    view_all.html("view all");
    view_all.removeClass("inactive");
    $('.control').fadeIn();
}

const matrix = $("<div id='matrix'></div>");
function create_matrix() {
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
            img.attr("src", "plot_imgs/layer" + layer + "_head" + head + ".png")
            img.attr("title", "layer " + layer + " head " + head);
            img.attr("layer", layer);
            img.attr("head", head);
            img.appendTo(matrix); // add to container
        }
    }
}

$(document).ready(function () { // on load
    // save variables
    const layer_menu = $("#layer");
    const head_menu = $("#head");
    const view_all = $("#view-all");
    const graph = $("#graph");

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

    view_all.click(function () { // when user presses 'view all' button
        // load matrix of all plots
        load_matrix();
        graph.addClass("active");
        $(this).addClass("inactive");
        $(this).html("click on a plot below to explore");
        $('.control').fadeOut();
        $('.mini-plot').click(function () { // when user presses plot in matrix view
            load_single_view($(this));
        })
    })

    create_matrix(); // pre create matrix
    load_graph(layer_menu.val(), head_menu.val()); // default to layer 0, head 0
});