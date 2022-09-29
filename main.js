function load_graph(layer, head) {
    console.log(layer + " " + head);
    // change graph displayed on UI
    $("#graph").load("plots/layer" + layer + "_head" + head + ".html");
}

$(document).ready(function () { // on load
    // save variables
    const layer_menu = $("#layer");
    const head_menu = $("#head");

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

    load_graph(layer_menu.val(), head_menu.val()); // default to layer 0, head 0

    $(".plotly-graph-div.js-plotly-plot").on('plotly_click', function () {
        alert('You clicked this Plotly chart!');
    });
});