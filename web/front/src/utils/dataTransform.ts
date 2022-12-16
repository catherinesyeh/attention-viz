import { Typing } from "@/utils/typing";
import * as d3 from "d3";
import * as _ from "underscore";

const computeMatrixProjectionPoint = (matrixData: Typing.MatrixData[], tokenData: Typing.TokenData[], matrixCellWidth = 100, matrixCellHeight = 100, matrixCellMargin = 20) => {
    var results = [] as Typing.Point[];

    // compute colors for each token
    const queryColor = d3.scaleSequential(function (t) {
        return d3.interpolateYlGn(t * 0.75 + 0.25);
    }).domain([0, 1]);
    const keyColor = d3.scaleSequential(function (t) {
        return d3.interpolatePuRd(t * 0.75 + 0.25);
    }).domain([0, 1]);
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
    const colorsByPosition = tokenData.map((td) => getColor(td));

    // compute msgs for each token
    const msgs = tokenData.map(
        (td) =>
            `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, pos: ${td.pos_int} of ${td.length})`
    );
    const values = tokenData.map(td => td.value);
    const types = tokenData.map(td => td.type);

    // for recording the x/y ranges
    let xs = [];
    let ys = [];

    // loop each plot (layer-head pair)
    for (const md of matrixData) {
        const { layer, head } = md;

        // compute plot-wise offset
        const xoffset = md.head * (matrixCellWidth + matrixCellMargin);
        const yoffset = -md.layer * (matrixCellHeight + matrixCellMargin);
        console.log(`compute data: layer ${md.layer}, head ${md.head}`);

        // compute coordinates for each token
        const data = md.tokens;
        const computeCoordinate = (projectionMethod: keyof Typing.PointCoordinate) => {
            const getX = (x: Typing.TokenCoordinate) => {
                if (projectionMethod === 'tsne') return x.tsne_x
                else if (projectionMethod === 'umap') return x.umap_x
                else throw Error('Invalid projection method')
            }
            const getY = (x: Typing.TokenCoordinate) => {
                if (projectionMethod === 'tsne') return x.tsne_y
                else if (projectionMethod === 'umap') return x.umap_y
                else throw Error('Invalid projection method')
            }
            const xScale = d3
                .scaleLinear()
                .domain(d3.extent(data.map((x) => getX(x))) as any)
                .range([0, matrixCellWidth]);
            const yScale = d3
                .scaleLinear()
                .domain(d3.extent(data.map((x) => getY(x))) as any)
                .range([0, matrixCellHeight]);
            return data.map(d => [xScale(getX(d)) + xoffset, yScale(getY(d)) + yoffset] as [number, number])
        }
        const pointsCoordinates = {
            'tsne': computeCoordinate('tsne'),
            'umap': computeCoordinate('umap')
        }

        // compute colors based on norms
        queryColor.domain(d3.extent(data.map(x => x.norm)) as [number, number]);
        keyColor.domain(d3.extent(data.map(x => x.norm)) as [number, number]);
        const colorByNorm = data.map((x, index) => {
            const tokenType = tokenData[index].type
            let colorstr = "rgb()";
            if (tokenType === 'query') {
                colorstr = queryColor(x.norm);
            } else if (tokenType === "key") {
                colorstr = keyColor(x.norm);
            }
            const color = d3.color(colorstr)?.rgb();
            if (!color) return [0, 0, 0];
            return [color.r, color.g, color.b];
        })

        const points = data.map((d, index) => ({
            coordinate: {
                tsne: pointsCoordinates.tsne[index],
                umap: pointsCoordinates.umap[index]
            },
            color: {
                position: colorsByPosition[index],
                norm: colorByNorm[index]
            },
            msg: msgs[index],
            layer,
            head,
            index,
            value: values[index],
            type: types[index]
        }));

        xs.push(...[xoffset, matrixCellWidth + xoffset]);
        ys.push(...[yoffset, matrixCellHeight + yoffset])

        results.push(...points);
    }

    return {
        'points': results,
        'range': {
            'x': d3.extent(xs) as [number, number],
            'y': d3.extent(ys) as [number, number]
        }
    }
};

/**
 * Compute text headings for each plot (head-layer)
 */
const computeMatrixProjectionLabel = (matrixData: Typing.MatrixData[], matrixCellWidth = 100, matrixCellHeight = 100, matrixCellMargin = 20) => {
    var results = [] as Typing.PlotHead[];

    for (const md of matrixData) {
        results.push({
            layer: md.layer,
            head: md.head,
            title: `L${md.layer} H${md.head}`,
            coordinate: [
                md.head * (matrixCellWidth + matrixCellMargin),
                -md.layer * (matrixCellHeight + matrixCellMargin),
            ],
        });
    }
    return results;
};

const computeMatrixProjection = (matrixData: Typing.MatrixData[], tokenData: Typing.TokenData[], matrixCellWidth = 100, matrixCellHeight = 100, matrixCellMargin = 20): Typing.Projection => {
    const pts = computeMatrixProjectionPoint(matrixData, tokenData, matrixCellWidth, matrixCellHeight, matrixCellMargin)
    return {
        'points': pts.points,
        'range': pts.range,
        'headings': computeMatrixProjectionLabel(matrixData, matrixCellWidth, matrixCellHeight, matrixCellMargin)
    }
}

export {
    computeMatrixProjection
}