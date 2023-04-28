import { Typing } from "@/utils/typing";
import * as d3 from "d3";
import * as _ from "underscore";

/* Utility functions for helping render visualization */

const computeMatrixProjectionPoint = (matrixData: Typing.MatrixData[], tokenData: Typing.TokenData[], matrixCellWidth = 100, matrixCellHeight = 100, matrixCellMargin = 20) => {
    var results = [] as Typing.Point[];
    const values = tokenData.map(td => td.value);
    const types = tokenData.map(td => td.type);
    const lengths = tokenData.map(td => td.length);

    const longestString = (arr: string[]) => { 
        // find longest string for later
        return arr.reduce((max,name) => {
             return name.length > max.length? name: max
         }, arr[0])
     }

     const shortestString = (arr: string[]) => { 
        // find shortest string for later
        return arr.reduce((max,name) => {
             return name.length < max.length? name: max
         }, arr[0])
     }

    const maxStringLength = longestString(values).length;
    const minStringLength = shortestString(values).length;
    const rangeStringLength = maxStringLength - minStringLength;
    const maxSentLength = lengths.reduce((a, b) => Math.max(a, b), -Infinity);
    const minSentLength = lengths.reduce((a, b) => Math.min(a, b), Infinity);
    const rangeSentLength = maxSentLength - minSentLength;

    // get token frequencies too
    let maxFreq = 0; // max token frequency

    const tokFreq = values.reduce((acc: any, curr: any) => {
        acc[curr] = (acc[curr] ?? 0) + 1;
        if (acc[curr] > maxFreq) {
            maxFreq = acc[curr];
        }
        return acc;
    }, {});

    const rangeFreq = maxFreq - 2;

    // compute colors for each token
    // by position
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

    // by length
    const getLengthColor = (td: Typing.TokenData) => {
        var colorstr = "rgb()";
        if (td.type === "query") {
            colorstr = queryColor((td.value.length - minStringLength) / rangeStringLength);
        } else if (td.type === "key") {
            colorstr = keyColor((td.value.length - minStringLength) / rangeStringLength);
        }
        const color = d3.color(colorstr)?.rgb();
        if (!color) return [0, 0, 0];
        return [color.r, color.g, color.b];
    };
    const colorsByLength = tokenData.map((td) => getLengthColor(td));

    // by sentence length
    const getSentColor = (td: Typing.TokenData) => {
        var colorstr = "rgb()";
        if (td.type === "query") {
            colorstr = queryColor((td.length - minSentLength) / rangeSentLength);
        } else if (td.type === "key") {
            colorstr = keyColor((td.length - minSentLength) / rangeSentLength);
        }
        const color = d3.color(colorstr)?.rgb();
        if (!color) return [0, 0, 0];
        return [color.r, color.g, color.b];
    };
    const colorsBySentLength = tokenData.map((td) => getSentColor(td));

    // by token frequency
    const getFreqColor = (td: Typing.TokenData) => {
        var colorstr = "rgb()";
        const freq = tokFreq[td.value] - 2;
        if (td.type === "query") {
            colorstr = queryColor(freq / rangeFreq);
        } else if (td.type === "key") {
            colorstr = keyColor(freq / rangeFreq);
        }
        const color = d3.color(colorstr)?.rgb();
        if (!color) return [0, 0, 0];
        return [color.r, color.g, color.b];
    };
    const colorsByFreq = tokenData.map((td) => getFreqColor(td));

    // by categorical position
    const discreteColors =  ["#F5C0CA","#E3378F","#F0D6A5","#EDB50E","#C4D6B8","#5FB96C","#C8DDED","#528DDB","#D6BAE3","#A144DB"];
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

    // by punctuation vs. not
    // orange, pink, blue, green
    const punctColors =  ["#F39226","#E3378F","#2E93D9","#5FB96C"];
    const getPunctColor = (td: Typing.TokenData) => {
        var colorstr = "rgb()";
        var punctuationless = td.value.replace(/[.,\/#!$?%\^&\*;:{}+=\-_`'"~()]/g, "");

        if (punctuationless.length == 0 || td.value == "[sep]" || td.value == "[cls]") {
            // token is only punctuation characters or special tokens
            colorstr = td.type === "query" ? punctColors[3] : punctColors[2]
        } else {
            // token has alphanumeric characters
            colorstr = td.type === "query" ? punctColors[0] : punctColors[1]
        }

        const color = d3.color(colorstr)?.rgb();
        if (!color) return [0, 0, 0];
        return [color.r, color.g, color.b];
    }
    const colorsByPunctuation = tokenData.map((td) => getPunctColor(td));

    // compute msgs for each token
    const pos_msgs = tokenData.map(
        (td) =>
            `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, pos: ${td.pos_int} of ${td.length - 1})`
    );
    const cat_msgs = tokenData.map(
        (td) =>
            `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, pos: ${td.pos_int} of ${td.length - 1}, pos % 5: ${td.pos_int % 5})`
    );
    const length_msgs = tokenData.map(
        (td) =>
            `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, pos: ${td.pos_int} of ${td.length - 1}, length: ${td.value.length})`
    );
    const freq_msgs = tokenData.map(
        (td) => 
        `<b class='${td.type}'>${td.value}</b> (<i>${td.type}</i>, pos: ${td.pos_int} of ${td.length - 1}, freq: ${tokFreq[td.value]})`
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

            // scale points to be within same range
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
                `<b class='${tokenData[index].type}'>${tokenData[index].value}</b> (<i>${tokenData[index].type}</i>, pos: ${tokenData[index].pos_int} of ${tokenData[index].length - 1}, norm: ${Math.round(x.norm * 100) / 100})`
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

        // color simply by type (key vs. query)
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

        // synthesize all point information
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
                position: colorsByPosition[index],
                pos_mod_5: colorsByDiscretePosition[index],
                punctuation: colorsByPunctuation[index],
                embed_norm: colorsByNorm[index],
                token_length: colorsByLength[index],
                sent_length: colorsBySentLength[index],
                token_freq: colorsByFreq[index],
                row: colorsByPosition[index],
                column: colorsByPosition[index],
                qk_map: colorsByPosition[index],
                no_outline: colorsByPosition[index],
            },
            msg: {
                position: pos_msgs[index],
                categorical: cat_msgs[index],
                norm: norm_msgs[index],
                length: length_msgs[index],
                freq: freq_msgs[index]
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

// compute projection for each point
const computeMatrixProjection = (matrixData: Typing.MatrixData[], tokenData: Typing.TokenData[], matrixCellWidth = 100, matrixCellHeight = 100, matrixCellMargin = 20): Typing.Projection => {
    const pts = computeMatrixProjectionPoint(matrixData, tokenData, matrixCellWidth, matrixCellHeight, matrixCellMargin)

    // get unique sentences
    const sentences = tokenData.map(td => td.sentence);
    const uniqueSentences = [...new Set(sentences)];
    return {
        'points': pts.points,
        'range': pts.range,
        'headings': computeMatrixProjectionLabel(matrixData, matrixCellWidth, matrixCellHeight, matrixCellMargin),
        'unique': uniqueSentences
    }
}

export {
    computeMatrixProjection
}