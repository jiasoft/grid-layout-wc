import { __decorate } from "tslib";
import { html, css, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
export class GridItemWc extends LitElement {
    get movePosition() {
        return { left: this.data.x * this.griddingWidth, top: this.data.y * this.griddingWidth };
    }
    ;
    get width() {
        return this.data.w * this.griddingWidth;
    }
    get height() {
        return this.data.h * this.griddingWidth;
    }
    constructor() {
        super();
        this.data = { x: 0, y: 0, w: 50, h: 20 };
        this.drag = false;
        this.edit = false;
        this.griddingWidth = 10;
        this.float = false;
        this.zIndex = 1000;
        this.resizeFixPosition = { top: 0, left: 0 };
        this.resizeingPosition = { top: 0, left: 0 };
        this.resizeing = (e) => {
            console.log(e);
            this.resizeingPosition.left = e.clientX;
            this.resizeingPosition.top = e.clientY;
            this.sendReszeEvent("resizeing");
        };
    }
    /** resize mouse down */
    resizeMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        this.resizeFixPosition.left = e.clientX;
        this.resizeFixPosition.top = e.clientY;
        this.resizeingPosition.left = e.clientX;
        this.resizeingPosition.top = e.clientY;
        document.body.setAttribute("onselectstart", "return false");
        document.body.style.cursor = "se-resize";
        window.addEventListener("mousemove", this.resizeing);
        this.sendReszeEvent("resizestart");
        const _this = this;
        window.addEventListener("mouseup", function mouseup() {
            document.body.removeAttribute("onselectstart");
            document.body.style.cursor = "";
            _this.sendReszeEvent("resizeend");
            window.removeEventListener("mousemove", _this.resizeing);
            window.removeEventListener("mouseup", mouseup);
        });
    }
    sendReszeEvent(type) {
        let w = this.data.w + Math.floor((this.resizeingPosition.left - this.resizeFixPosition.left) / this.griddingWidth);
        let h = this.data.h + Math.floor((this.resizeingPosition.top - this.resizeFixPosition.top) / this.griddingWidth);
        let x = this.data.x;
        let y = this.data.y;
        let id = this.data.id;
        const event = new Event(type);
        event.detail = { w, h, x, y, id, data: this.data };
        this.dispatchEvent(event);
    }
    ;
    // connectedCallback(){
    // }
    // disconnectedCallback(){
    // }
    render() {
        return html `<div
    class="grid-item"
    drag="${this.drag}"
    .class="${this.edit ? 'move' : ''}"
    :float-ing="float"
    :move-ing="move"
    style="left:${this.movePosition.left}px; top:${this.movePosition.top}px; z-index:${this.float ? (1000 + this.zIndex) : (100 + this.zIndex)};width:${this.width}px; height:${this.height}px"
    @mousedown="mousedown($event)">
 
    <slot></slot>
    <div class="tool-box">
      <i class="el-icon set-float" @click="setFloat()">
        <!--[-->
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-subtract" viewBox="0 0 16 16">
          <path d="M0 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
        </svg>
        <!--]-->
      </i>
      <i @click="close()" class="el-icon close" style="font-size:20px;" >
        <!--[-->
        <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.184z"></path></svg>
        <!--]-->
      </i>
    </div>
    <div class="resize bottom-right" @mousedown="${this.resizeMouseDown}" v-if="props.edit">
      
    </div>
  </div>
    `;
    }
}
GridItemWc.styles = css `
  :host {
    display: block;
    padding: 0px;
  }
  .grid-item {
   display:block;
   
   min-width: 80px;
   min-height: 50px;
   border-radius: 3px;
   overflow:hidden;
   background-color:#fff;
   box-shadow: 0px 0px 6px -2px rgb(48 47 51);
   box-sizing: border-box;
   transition: all 0.3s;
 }
  .grid-item.move {
   cursor:move;
 }
 .grid-item[move-ing="true"] {
   box-shadow: 0px 0px 6px -2px rgb(48 47 51);
   transition: none;
 }
 .grid-item[float-ing="true"]{
   border:2px solid rgb(207 207 207);
   box-shadow: 0px 0px 6px -2px rgb(48 47 51);
 }
 .grid-item[float-ing="true"] .set-float{
   opacity: 1;
   color:#fff;
   background-color:#a5a5a5;
 }
 
 .grid-item:hover .resize{
   display: flex;
 }
 .grid-item .bottom-right{
  cursor: se-resize;
  right: 4px;
  bottom: 4px;
  width: 10px;
  height: 10px;
  border-right: 3px solid #a19e9e;
  border-bottom: 3px solid #a19e9e;
 }
 
 .grid-item .tool-box {
  position: absolute;
  top:5px;
  right:10px;
  display: flex;
}
.grid-item  .tool-box .el-icon {
  width:15px;
  height:15px;
  color:#929292;
  padding:3px;
  border-radius: 3px;
  display: flex;
}
.grid-item .tool-box .el-icon:hover{
  cursor:pointer;
  opacity: 0.6;
}
 .grid-item .resize > svg {
   color: rgb(160 160 160)
 }
 .grid-item .resize:hover{
   opacity: 0.6;
 }
 
 .grid-item[drag=true] {
  opacity: 0.5;
  background-color: rgb(249, 227, 193);
  box-shadow: none;
  border: none;
  cursor: auto;
  transition: none;
}
.grid-item[drag=true] .close,
.grid-item[drag=true] .set-float,
.grid-item[drag=true] .bottom-right {
  display: none;
}

.resize{
  position: absolute;
  display: none;
}


`;
__decorate([
    property({ type: Array })
], GridItemWc.prototype, "data", void 0);
__decorate([
    property({ type: Boolean })
], GridItemWc.prototype, "drag", void 0);
__decorate([
    property({ type: Boolean })
], GridItemWc.prototype, "edit", void 0);
__decorate([
    property({ type: Number })
], GridItemWc.prototype, "griddingWidth", void 0);
__decorate([
    property({ type: Number })
], GridItemWc.prototype, "float", void 0);
__decorate([
    property({ type: Number })
], GridItemWc.prototype, "zIndex", void 0);
//# sourceMappingURL=GridItemWc.js.map