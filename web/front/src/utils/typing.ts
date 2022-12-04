// define the types here
export namespace Typing {
    export interface MatrixData {
        head: number;
        layer: number;
        tokens: TokenCoordinate[];
    }
    export interface TokenCoordinate {
        tsne_x: number;
        tsne_y: number;
        umap_x: number;
        umap_y: number;
        norm: number;
    }
    export interface TokenData {
        position: number;
        pos_int: number;
        length: number;
        sentence: string;
        type: string;
        value: string;
    }

}