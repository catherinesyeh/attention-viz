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
    }
    export interface AttentionData {
        head: number;
        layer: number;
        tokens: AttnCoordinate[];
    }
    export interface AttnCoordinate {
        attention: number[];
    }
    export interface TokenData { // shared by all heads and layers
        position: number;
        pos_int: number;
        length: number;
        sentence: string;
        type: string;
        value: string;
    }

    // export type projectionMethod = "tsne" | "umap";
    // export type colorBy = "byPosition" | "byNorm";

    export interface PointCoordinate {
        tsne: [number, number];
        umap: [number, number];
    }

    export interface PointColor {
        type: number[];
        position: number[];
        categorical: number[];
        norm: number[];
    }

    export interface PointMsg {
        position: string;
        categorical: string;
        norm: string;
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
    }
    export interface PlotHead {
        layer: number;
        head: number;
        title: string;
        coordinate: [number, number];
    }
    export interface Projection {
        points: Point[];
        headings: PlotHead[];
        range: {
            x: [number, number];
            y: [number, number];
        }
    }

    export interface AttnByToken {
        layer: number;
        head: number;
        attns: number[][];
        token: TokenData
    }
}