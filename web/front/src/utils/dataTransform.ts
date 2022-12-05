import { Typing } from "@/utils/typing";
import * as d3 from "d3";
import * as _ from "underscore";

const computeMatrixProjection = (matrixData: Typing.MatrixData[], tokenData: Typing.TokenData[], matrixCellWidth = 100, matrixCellHeight = 100, matrixCellMargin = 20) => {
    let points = [] as Typing.Point[];

    console.log(matrixCellWidth, matrixCellHeight, matrixCellMargin);

    // compute colors for each token
    const queryColor = d3.scaleSequential().domain([0, 1]).interpolator(d3.interpolateYlGn);
    const keyColor = d3.scaleSequential().domain([0, 1]).interpolator(d3.interpolatePuRd);
    const getColor = (td: Typing.TokenData) => {
        var colorstr = "rgb()";
        if (td.type === "query") {
            colorstr = queryColor(td.position);
        } else if (td.type === "key") {
            colorstr = keyColor(td.position);
        }
        const color = d3.color(colorstr)?.rgb();
        if (!color) return [0, 0, 0];
        return [color.r, color.g, color.b];
    };
    const colors = tokenData.map((td) => getColor(td));

    // compute msgs for each token
    const msgs = tokenData.map(
        (td) =>
            `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, pos: ${td.pos_int} of ${td.length})`
    );

    // loop each plot (layer-head pair)
    for (const md of matrixData) {
        // compute plot-wise offset
        const xoffset = md.head * (matrixCellWidth + matrixCellMargin);
        const yoffset = -md.layer * (matrixCellHeight + matrixCellMargin);
        console.log(`compute data: layer ${md.layer}, head ${md.head}`);

        // compute coordinates for each token
        const data = md.tokens;
        const xScale = d3
            .scaleLinear()
            .domain(d3.extent(data.map((x) => x.tsne_x)) as any)
            .range([0, matrixCellWidth]);
        const yScale = d3
            .scaleLinear()
            .domain(d3.extent(data.map((x) => x.tsne_y)) as any)
            .range([0, matrixCellHeight]);
        const points = data.map((d, idx) => ({
            coordinate: [xScale(d.tsne_x) + xoffset, yScale(d.tsne_y) + yoffset] as [number, number],
            color: colors[idx],
            msg: msgs[idx],
        }));

        points.push(...points);
    }

    return points;
};
export {
    computeMatrixProjection
}