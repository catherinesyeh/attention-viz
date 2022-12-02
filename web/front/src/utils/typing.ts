// define the types here
export namespace Typing {
    export interface MatrixData {
        head: number;
        layer: number;
        tokens: TokenData[];
    }
    export interface TokenData {
        position: number;
        tsne_x: number;
        tsne_y: number;
        type: string;
        umap_x: number;
        umap_y: number;
        value: string;
    }

}