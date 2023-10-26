import { LitElement } from 'lit';
type Position = {
    left: number;
    top: number;
};
export declare class GridItemWc extends LitElement {
    data: any;
    drag: boolean;
    edit: boolean;
    griddingWidth: number;
    float: boolean;
    zIndex: number;
    resizeFixPosition: {
        top: number;
        left: number;
    };
    resizeingPosition: {
        top: number;
        left: number;
    };
    get movePosition(): Position;
    get width(): number;
    get height(): number;
    constructor();
    /** resize mouse down */
    resizeMouseDown(e: MouseEvent): void;
    resizeing: (e: any) => void;
    sendReszeEvent(type: any | "resizestart" | "resizeing" | "resizeend"): void;
    render(): import("lit-html").TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
export {};
