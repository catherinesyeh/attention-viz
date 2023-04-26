// define the types here
export namespace Typing {
    export interface MatrixData {
        head: number;
        layer: number;
        tokens: TokenCoordinate[];
    }
    export interface TokenCoordinate { // depends on head and layer
        tsne_x: number;
        tsne_y: number;
        umap_x: number;
        umap_y: number;
        norm: number;
        tsne_x_3d: number;
        tsne_y_3d: number;
        tsne_z_3d: number;
        umap_x_3d: number;
        umap_y_3d: number;
        umap_z_3d: number;
        pca_x: number;
        pca_y: number;
        pca_x_3d: number;
        pca_y_3d: number;
        pca_z_3d: number;
    }
    export interface TokenData { // shared by all heads and layers
        position: number;
        pos_int: number;
        length: number;
        sentence: string;
        type: string;
        value: string;
        imagePath: string;
        originalPatchPath: string;
        originalImagePath: string;
    }
    export interface PointCoordinate {
        tsne: [number, number];
        umap: [number, number];
        pca: [number, number];
        tsne_3d: [number, number, number];
        umap_3d: [number, number, number];
        pca_3d: [number, number, number];
    }
    export interface PointColor {
        query_key: number[];
        position: number[];
        pos_mod_5: number[];
        punctuation: number[];
        embed_norm: number[];
        token_length: number[];
        sent_length: number[];
        token_freq: number[];
        row: number[];
        column: number[];
        qk_map: number[];
        no_outline: number[];
    }
    export interface PointMsg {
        position: string;
        categorical: string;
        norm: string;
        length: string;
        freq: string;
    }
    export interface Point {
        coordinate: PointCoordinate;
        color: PointColor;
        msg: PointMsg;
        layer: number;
        head: number;
        index: number;
        value: string;
        type: string;
        normScaled: number;
        imagePath: string;
        originalPatchPath: string;
    }
    export interface PlotHead {
        layer: number;
        head: number;
        title: [string, string];
        coordinate: [number, number];
    }
    export interface Projection {
        points: Point[];
        headings: PlotHead[];
        range: {
            x: [number, number];
            y: [number, number];
        },
        images: string[]
    }
    export interface AttnByToken {
        layer: number;
        head: number;
        attns: number[][];
        agg_attns: number[][];
        norms: number[];
        agg_norms: number[];
        token: TokenData
    }
}