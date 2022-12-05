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

    export interface Point {
        coordinate: [number, number];
        color: any;
        msg: string;
    }
}