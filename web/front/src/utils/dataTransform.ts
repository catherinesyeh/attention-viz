import { Typing } from "@/utils/typing";
import * as d3 from "d3";
import * as _ from "underscore";

const computeMatrixProjectionPoint = (matrixData: Typing.MatrixData[], tokenData: Typing.TokenData[], matrixCellWidth = 100, matrixCellHeight = 100, matrixCellMargin = 20) => {
    var results = [] as Typing.Point[];
    const values = tokenData.map(td => td.value);
    const types = tokenData.map(td => td.type);

    const longestString = (arr: string[]) => { 
        // find longest string for later
        return arr.reduce((max,name) => {
             return name.length > max.length? name: max
         }, arr[0])
     }
    const maxStringLength = longestString(values).length;

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

    const getLengthColor = (td: Typing.TokenData) => {
        var colorstr = "rgb()";
        if (td.type === "query") {
            colorstr = queryColor(td.value.length / maxStringLength);
        } else if (td.type === "key") {
            colorstr = keyColor(td.value.length / maxStringLength);
        }
        const color = d3.color(colorstr)?.rgb();
        if (!color) return [0, 0, 0];
        return [color.r, color.g, color.b];
    };
    const colorsByLength = tokenData.map((td) => getLengthColor(td));

    // const discreteColors =  ["#fb9a99","#e31a1c","#fdbf6f","#ff7f00","#b2df8a","#33a02c","#a6cee3","#1f78b4","#cab2d6","#6a3d9a"];
    // const discreteColors =  ["#FFB5CF","#E3378F","#f5ca86","#F39226","#addfa2","#5FB96C","#9fd2ea","#2E93D9","#CFB0EF","#7F5BDB"];
    const discreteColors =  ["#F5C0CA","#E3378F","#F0D6A5","#EDB50E","#C4D6B8","#5FB96C","#C8DDED","#528DDB","#D6BAE3","#A144DB"];
    // const discreteColors =  ["#ED82B9","#9BD3A3","#E3378F","#5FB96C","#AA296B","#3B7444"];
    const numDiscrete = discreteColors.length / 2;

    const getDiscreteColor = (td: Typing.TokenData) => {
        var colorstr = "rgb()";
        if (td.type === "query") {
            colorstr = discreteColors[2 * (td.pos_int % numDiscrete) + 1];
        } else if (td.type === "key") {
            colorstr = discreteColors[2 * (td.pos_int % numDiscrete)];
        }
        const color = d3.color(colorstr)?.rgb();
        if (!color) return [0, 0, 0];
        return [color.r, color.g, color.b];
    };
    const colorsByDiscretePosition = tokenData.map((td) => getDiscreteColor(td));

    const punctColors =  ["#F39226","#E3378F","#2E93D9","#5FB96C"];
    const getPunctColor = (td: Typing.TokenData) => {
        var colorstr = "rgb()";
        var punctuationless = td.value.replace(/[.,\/#!$?%\^&\*;:{}+=\-_`'"~()]/g, "");

        if (punctuationless.length == 0) {
            // token is only punctuation characters
            colorstr = td.type === "query" ? punctColors[2] : punctColors[0]
        } else {
            // token has alphanumeric characters
            colorstr = td.type === "query" ? punctColors[3] : punctColors[1]
        }

        const color = d3.color(colorstr)?.rgb();
        if (!color) return [0, 0, 0];
        return [color.r, color.g, color.b];
    }

    const colorsByPunctuation = tokenData.map((td) => getPunctColor(td));

    // compute msgs for each token
    const pos_msgs = tokenData.map(
        (td) =>
            `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, pos: ${td.pos_int} of ${td.length})`
    );
    const cat_msgs = tokenData.map(
        (td) =>
            `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, pos: ${td.pos_int} of ${td.length}, pos % 5: ${td.pos_int % 5})`
    );
    const length_msgs = tokenData.map(
        (td) =>
            `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, pos: ${td.pos_int} of ${td.length}, length: ${td.value.length})`
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

        // compute colors based on norms
        queryColor.domain(d3.extent(data.map(x => x.norm)) as [number, number]);
        keyColor.domain(d3.extent(data.map(x => x.norm)) as [number, number]);
        const colorsByNorm = data.map((x, index) => {
            const tokenType = tokenData[index].type;
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

        const norm_msgs = data.map(
            (x, index) =>
                `<b class='${tokenData[index].type}'>${tokenData[index].value}</b> (<i>${tokenData[index].type}</i>, pos: ${tokenData[index].pos_int} of ${tokenData[index].length}, norm: ${Math.round(x.norm * 100) / 100})`
        );

        const norms = data.map((x) => x.norm);
        const norm_range = d3.extent(norms) as [number, number];
        const min_norm = norm_range[0];
        const max_norm = norm_range[1];
        const range_norm = max_norm - min_norm;
        // round to 6 decimal places
        const norms_scaled = norms.map((x) => {
            let scaled = (x - min_norm) / range_norm;
            return +scaled.toFixed(6);
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
                position: colorsByPosition[index],
                categorical: colorsByDiscretePosition[index],
                punctuation: colorsByPunctuation[index],
                norm: colorsByNorm[index],
                length: colorsByLength[index]
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
            value: values[index],
            type: types[index],
            normScaled: norms_scaled[index]
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