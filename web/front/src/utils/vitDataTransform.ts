import { Typing } from "@/utils/typing";
import * as d3 from "d3";
import * as _ from "underscore";

const computeMatrixProjectionPoint = (matrixData: Typing.MatrixData[], tokenData: Typing.TokenData[], matrixCellWidth = 100, matrixCellHeight = 100, matrixCellMargin = 20, num_tokens = 7) => {
    var results = [] as Typing.Point[];
    const types = tokenData.map(td => td.type);
    const values = tokenData.map(td => td.value);

    const rows = tokenData.map(td => td.position);

    num_tokens = Math.max(...rows);

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
                return data.map(d => [+xScale(getX(d)).toFixed(3) + xoffset, +yScale(getY(d)).toFixed(3) + yoffset] as [number, number]);
            }
            // 3d case
            const zScale = d3
                .scaleLinear()
                .domain(d3.extent(data.map((x) => getZ(x))) as any)
                .range([0, matrixCellHeight]);
            return data.map(d => [+xScale(getX(d)).toFixed(3) + xoffset, 
                +yScale(getY(d)).toFixed(3) + yoffset, 
                +zScale(getZ(d)).toFixed(3)] as [number, number, number]);
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
        const original_patch_path = tokenData.map(td => td.originalPatchPath)
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


        const queryColor = d3.scaleSequential(function (t) {
            return d3.interpolateYlGn(t / num_tokens * 0.75 + 0.25);
        }).domain([0, 1]);
        const keyColor = d3.scaleSequential(function (t) {
            return d3.interpolatePuRd(t / num_tokens * 0.75 + 0.25);
        }).domain([0, 1]);

        const getRowColor = (td: Typing.TokenData) => {
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
        const colorsByRow = tokenData.map((td) => getRowColor(td));

        const getColColor = (td: Typing.TokenData) => {
            var colorstr = "rgb()";
            if (td.type === "query") {
                colorstr = queryColor(td.pos_int);
            } else if (td.type === "key") {
                colorstr = keyColor(td.pos_int);
            }
            const color = d3.color(colorstr)?.rgb();
            if (!color) return [0, 0, 0];
            return [color.r, color.g, color.b];
        };
        const colorsByCol = tokenData.map((td) => getColColor(td));

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
                query_key: colorsByType[index],
                position: colorsByRow[index],
                pos_mod_5: colorsByType[index],
                punctuation: colorsByCol[index],
                embed_norm: colorsByType[index],
                token_length: colorsByType[index],
                sent_length: colorsByType[index],
                token_freq: colorsByType[index],
                row: colorsByRow[index],
                column: colorsByCol[index],
                qk_map: colorsByType[index],
                no_outline: colorsByType[index],
            },
            msg: {
                position: pos_msgs[index],
                categorical: cat_msgs[index],
                norm: norm_msgs[index],
                length: length_msgs[index],
                freq: pos_msgs[index]
            },
            layer,
            head,
            index,
            value: values[index],
            type: types[index],
            normScaled: norms_scaled[index],
            imagePath: image_path[index],
            originalPatchPath: original_patch_path[index],
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
            title: [`L${md.layer} H${md.head}`, `Layer ${md.layer} Head ${md.head}`],
            coordinate: [
                md.head * (matrixCellWidth + matrixCellMargin),
                -md.layer * (matrixCellHeight + matrixCellMargin),
            ],
        });
    }
    return results;
};

const computeVitMatrixProjection = (matrixData: Typing.MatrixData[], tokenData: Typing.TokenData[], matrixCellWidth = 100, matrixCellHeight = 100, matrixCellMargin = 20, num_tokens = 7): Typing.Projection => {
    const pts = computeMatrixProjectionPoint(matrixData, tokenData, matrixCellWidth, matrixCellHeight, matrixCellMargin, num_tokens)
    
    // get unique images
    const images = tokenData.filter(td => td.originalImagePath != 'null').map(td => td.originalImagePath);
    const uniqueImages = [...new Set(images)];
    return {
        'points': pts.points,
        'range': pts.range,
        'headings': computeMatrixProjectionLabel(matrixData, matrixCellWidth, matrixCellHeight, matrixCellMargin),
        'unique': uniqueImages
    }
}

export {
    computeVitMatrixProjection
}