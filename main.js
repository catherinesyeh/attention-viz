function load_graph(layer, head) {
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

    load_graph(0, 0); // default to layer 0, head 0
});