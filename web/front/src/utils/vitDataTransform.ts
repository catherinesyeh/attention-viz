import { Typing } from "@/utils/typing";
import * as d3 from "d3";
import { image } from "d3";
import * as _ from "underscore";

const computeMatrixProjectionPoint = (matrixData: Typing.MatrixData[], tokenData: Typing.TokenData[], matrixCellWidth = 100, matrixCellHeight = 100, matrixCellMargin = 20) => {
    var results = [] as Typing.Point[];
    const types = tokenData.map(td => td.type);

    // compute msgs for each token
    const pos_msgs = tokenData.map(
        (td) =>
            `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, row: ${td.position}, col: ${td.pos_int})`
    );
    const cat_msgs = tokenData.map(
        (td) =>
            `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, row: ${td.position}, col: ${td.pos_int})`
    );
    const length_msgs = tokenData.map(
        (td) =>
            `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, row: ${td.position}, col: ${td.pos_int})`
    );

    // for recording the x/y ranges
    let xs = [];
    let ys = [];

    // loop each plot (layer-head pair)
    for (const md of matrixData) {
        const { layer, head } = md;

        // compute plot-wise offset
        const xoffset = md.head * (matrixCellWidth + matrixCellMargin);
        const yoffset = -md.layer * (matrixCellHeight + matrixCellMargin);
        // console.log(`compute data: layer ${md.layer}, head ${md.head}`);

        // compute coordinates for each token
        const data = md.tokens;
        const computeCoordinate = (projectionMethod: keyof Typing.PointCoordinate) => {
            const getX = (x: Typing.TokenCoordinate) => {
                if (projectionMethod === 'tsne') return x.tsne_x
                else if (projectionMethod === 'umap') return x.umap_x
                else if (projectionMethod === 'pca') return x.pca_x
                else if (projectionMethod === 'tsne_3d') return x.tsne_x_3d
                else if (projectionMethod === 'umap_3d') return x.umap_x_3d
                else if (projectionMethod === 'pca_3d') return x.pca_x_3d
                else throw Error('Invalid projection method')
            }
            const getY = (x: Typing.TokenCoordinate) => {
                if (projectionMethod === 'tsne') return x.tsne_y
                else if (projectionMethod === 'umap') return x.umap_y
                else if (projectionMethod === 'pca') return x.pca_y
                else if (projectionMethod === 'tsne_3d') return x.tsne_y_3d
                else if (projectionMethod === 'umap_3d') return x.umap_y_3d
                else if (projectionMethod === 'pca_3d') return x.pca_y_3d
                else throw Error('Invalid projection method')
            }
            const getZ = (x: Typing.TokenCoordinate) => {
                if (projectionMethod === 'tsne_3d') return x.tsne_z_3d
                else if (projectionMethod === 'umap_3d') return x.umap_z_3d
                else if (projectionMethod === 'pca_3d') return x.pca_z_3d
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

            if (projectionMethod === "tsne" || projectionMethod === "umap" || projectionMethod === "pca") { // 2d case
                return data.map(d => [+xScale(getX(d)).toFixed(6) + xoffset, +yScale(getY(d)).toFixed(6) + yoffset] as [number, number]);
            }
            // 3d case
            const zScale = d3
                .scaleLinear()
                .domain(d3.extent(data.map((x) => getZ(x))) as any)
                .range([0, matrixCellHeight]);
            return data.map(d => [+xScale(getX(d)).toFixed(6) + xoffset, 
                +yScale(getY(d)).toFixed(6) + yoffset, 
                +zScale(getZ(d)).toFixed(6)] as [number, number, number]);
        }
        const pointsCoordinates = {
            'tsne': computeCoordinate('tsne'),
            'umap': computeCoordinate('umap'),
            'pca': computeCoordinate('pca'),
            'tsne_3d': computeCoordinate('tsne_3d'),
            'umap_3d': computeCoordinate('umap_3d'),
            'pca_3d': computeCoordinate('pca_3d')
        }

        const norm_msgs = data.map(
            (x, index) =>
                `<b class='${tokenData[index].type}'>${tokenData[index].value}</b> (<i>${tokenData[index].type}</i>, row: ${tokenData[index].position}, col: ${tokenData[index].pos_int})`
        );

        const image_path = tokenData.map(td => td.imagePath)
        const norms = data.map((x) => x.norm);
        const norm_range = d3.extent(norms) as [number, number];
        const min_norm = norm_range[0];
        const max_norm = norm_range[1];
        const range_norm = max_norm - min_norm;
        // round to 3 decimal places
        const norms_scaled = norms.map((x) => {
            let scaled = (x - min_norm) / range_norm;
            return +scaled.toFixed(3);
        });

        const colorsByType = data.map((x, index) => {
            const tokenType = tokenData[index].type
            let colorstr = "rgb()";
            if (tokenType === "query") {
                colorstr = "rgb(95, 185, 108)";
            } else if (tokenType === "key") {
                colorstr = "rgb(227, 55, 143)";
            }
            const color = d3.color(colorstr)?.rgb();
            if (!color) return [0, 0, 0];
            return [color.r, color.g, color.b];
        })

        const points = data.map((d, index) => ({
            coordinate: {
                tsne: pointsCoordinates.tsne[index] as [number, number],
                umap: pointsCoordinates.umap[index] as [number, number],
                pca: pointsCoordinates.pca[index] as [number, number],
                tsne_3d: pointsCoordinates.tsne_3d[index] as [number, number, number],
                umap_3d: pointsCoordinates.umap_3d[index] as [number, number, number],
                pca_3d: pointsCoordinates.pca_3d[index] as [number, number, number],
            },
            color: {
                type: colorsByType[index],
                position: colorsByType[index],
                categorical: colorsByType[index],
                punctuation: colorsByType[index],
                norm: colorsByType[index],
                length: colorsByType[index]
            },
            msg: {
                position: pos_msgs[index],
                categorical: cat_msgs[index],
                norm: norm_msgs[index],
                length: length_msgs[index]
            },
            layer,
            head,
            index,
            value: types[index],
            type: types[index],
            normScaled: norms_scaled[index],
            imagePath: image_path[index],
        }));

        xs.push(...[xoffset, matrixCellWidth + xoffset]);
        ys.push(...[yoffset, matrixCellHeight + yoffset]);

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

const computeVitMatrixProjection = (matrixData: Typing.MatrixData[], tokenData: Typing.TokenData[], matrixCellWidth = 100, matrixCellHeight = 100, matrixCellMargin = 20): Typing.Projection => {
    const pts = computeMatrixProjectionPoint(matrixData, tokenData, matrixCellWidth, matrixCellHeight, matrixCellMargin)
    return {
        'points': pts.points,
        'range': pts.range,
        'headings': computeMatrixProjectionLabel(matrixData, matrixCellWidth, matrixCellHeight, matrixCellMargin)
    }
}

export {
    computeVitMatrixProjection
}