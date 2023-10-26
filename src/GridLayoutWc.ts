import { html, css, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';
interface ItemData  {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface GridItemData  extends ItemData{
  id: number;
  z:number;
  selected?:boolean;
  dataSource?: any;
  time?: number;
  title?: string;
  float?: boolean;
  slot?:string;
  style?:{left:number,top:number,width:number,height:number}
}
type HtmlPosition = {
  left: number;
  top: number;
}
type GridPosition = {
  x: number;
  y: number;
}
const DRAG_ID = 100000;

export class GridLayoutWc extends LitElement {
  @state() RenderIndex: number = 0; //这个属性改动，页面才会render
  @property({ type: Number }) griddingWidth = 10;
  @property({ type: Number }) gridMargin = 1;
  @property({ type: Boolean }) edit = false;
  @property({ type: Array }) layoutData: GridItemData[] = [];
  dragData = { x: 0, y: 0, w: 60, h: 60, z: 0, id: DRAG_ID };
  draggIng: boolean = false;
  stageHeight: number = 0;
  stageWidth: number = 1000;
  resizeFixPosition: any = { top: 0, left: 0 };
  resizeingPosition: any = { top: 0, left: 0 };
  curResizingGridItemData: any|null = null;
  zIndex = 100;
  dataStore: any[] = [];
  dataStoreIndex: number = 0;
  curMovingGridItemData: any|null = null;
  movePosition: HtmlPosition = { left: 0, top: 0 };
  fixPosition: HtmlPosition = { left: 0, top: 0 };
  oldPosition: HtmlPosition = { left: 0, top: 0 };
  transition:boolean = false;
  drawDragDataHtml() {
    return html`<div class="grid-item drag" drag="${true}" style="${this.getGridItemStyle(this.dragData)}"></div>`
  }
  constructor() {
    super();

  }
  //查找GridItem
  findGridItemData = (id: any): GridItemData | undefined => {
    return this.layoutData.find((item: GridItemData) => item.id === id);
  }
  //add
  addGridItem() {
    const w = 30;
    const h = 12;
    let { x, y } = this.getEmptyBound(w, h);
    let time = new Date().getTime();
    const item: GridItemData = { x, y, w, h, z: 0, id: time, title: time.toString() };
    this.layoutData.push(item);
    this.RenderIndex ++;
    this.saveCurLayout();
  }
  /**
   * 获取空间的位置
   * @param w 
   * @param h 
   * @returns { x, y }
   */
  getEmptyBound(w: number, h: number) {

    this.stageWidth = this.getBoundingClientRect().width;
    let x = this.gridMargin, y = this.gridMargin;
    let item = this.findBigestOverlapItem(x, y, w, h);
    while (item) {
      x = item.x + item.w + this.gridMargin;
      if ((x + this.gridMargin) * this.griddingWidth + w * this.griddingWidth > this.stageWidth) {
        y += this.gridMargin;
        x = this.gridMargin;
      }
      item = this.findBigestOverlapItem(x, y, w, h);
    }
    return { x, y };
  }
  /**
   * 查找存在的最大的重叠交叉项
   * */
  findBigestOverlapItem = (x: number, y: number, w: number, h: number, exceptIds?: any[]): GridItemData | undefined => {
    const list = this.findOverlapItem(x, y, w, h, exceptIds);
    let BigestOverlapArea = -99999999999; //最大的重叠交叉面积
    let BigestOverlapItem: any = undefined;
    list.forEach((item: any) => {
      let curItemX = item.x;
      let curItemY = item.y;
      let curItemW = item.w;
      let curItemH = item.h;
      if (this.curActiveGridItem && this.curActiveGridItem.id === item.id && this.dragData ) {
        curItemX = this.dragData.x;
        curItemY = this.dragData.y;
        curItemW = this.dragData.w;
        curItemH = this.dragData.h;
      }
      const overX1 = Math.max(x, curItemX);
      const overX2 = Math.min(x + w, curItemX + curItemW);
      const overW = overX2 - overX1;
      const overY1 = Math.max(y, curItemY);
      const overY2 = Math.min(y + h, curItemY + curItemH);
      const overH = overY2 - overY1;
      const overArea = overH * overW;
      if (overArea > BigestOverlapArea) {
        BigestOverlapArea = overArea;
        BigestOverlapItem = item;
      }
    });

    return BigestOverlapItem;
  }
  /**
   * 获取交叉的GridItem 列表
   * @param x x
   * @param y y
   * @param w w
   * @param h h
   * @param exceptIds 排序的id
   * @returns 交叉的GridItem 列表
   */
  findOverlapItem = (x: number, y: number, w: number, h: number, exceptIds?: any[]): GridItemData[] => {

    const list: GridItemData[] = [];
    const data = this.layoutData.filter((item: any) => !item.float);
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      if (exceptIds && exceptIds.indexOf(item.id) >= 0) {
        continue;
      }
      let curItemX = item.x;
      let curItemY = item.y;
      let curItemW = item.w;
      let curItemH = item.h;
      if (this.curActiveGridItem && this.curActiveGridItem.id === item.id && this.dragData) {
        curItemX = this.dragData.x;
        curItemY = this.dragData.y;
        curItemW = this.dragData.w;
        curItemH = this.dragData.h;
      }
      let x1 = Math.min(curItemX, x);
      let x2 = Math.max(curItemX + curItemW, x + w);


      let y1 = Math.min(curItemY, y);
      let y2 = Math.max(curItemY + curItemH, y + h);

      //是否存在交叉的算法
      if (((x2 - x1) - (curItemW + w)) < this.gridMargin &&
        ((y2 - y1) - (curItemH + h)) < this.gridMargin) {
        list.push(item);
      }
    }
    return list;
  }
  /**
   * Resize start
   * @param event MouseEvent
   */
  gridItemResizeStart(event:MouseEvent) {
    if (!this.edit) return;
    event.preventDefault();
    event.stopPropagation();

    const index = this.getGridItemIndex(event.currentTarget);
    this.curResizingGridItemData = this.layoutData[index];
    this.resizeFixPosition.left = event.clientX;
    this.resizeFixPosition.top = event.clientY;
    this.resizeingPosition.left = event.clientX;
    this.resizeingPosition.top = event.clientY;
    this.transition = true;
    this.RenderIndex++;
    document.body.setAttribute("onselectstart", "return false");
    document.body.style.cursor = "se-resize";

    const mouseMove = (event: MouseEvent) => {
      this.gridItemResizeing(event)
    }
    let { x, y, w, h, id } = this.curResizingGridItemData;
    this.dragData.x = x;
    this.dragData.y = y;
    this.dragData.w = w;
    this.dragData.h = h;
    
    const mouseup = () => {
      document.body.removeAttribute("onselectstart");
      document.body.style.cursor = "";
      this.gridItemResizeEnd();
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseup);
    }
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseup);
  }
  /**
   * resizeing
   * @param event 
   */
  gridItemResizeing(event: any) {
    if (!this.edit) return;
    this.resizeingPosition.left = event.clientX;
    this.resizeingPosition.top = event.clientY;
    
    let w = this.curResizingGridItemData.w + Math.round((this.resizeingPosition.left - this.resizeFixPosition.left) / this.griddingWidth);
    let h = this.curResizingGridItemData.h + Math.round((this.resizeingPosition.top - this.resizeFixPosition.top) / this.griddingWidth);
    let x = this.curResizingGridItemData.x;
    let y = this.curResizingGridItemData.y;
    let z = this.curResizingGridItemData.z;
    
    if (this.curResizingGridItemData.float) {
      this.draggIng = true;
      this.dragData.x = x;
      this.dragData.y = y;
      this.dragData.w = w;
      this.dragData.h = h;
      this.dragData.z = z;
      this.RenderIndex++;
      return;
    }
    let height = this.curResizingGridItemData.h * this.griddingWidth + (this.resizeingPosition.top - this.resizeFixPosition.top)
    let width = this.curResizingGridItemData.w * this.griddingWidth + (this.resizeingPosition.left - this.resizeFixPosition.left);
    if(width > this.stageWidth -x * this.griddingWidth) {
      width = this.stageWidth -x * this.griddingWidth;
    }
    this.curResizingGridItemData.style = {width,height,left:x * this.griddingWidth,top:y * this.griddingWidth};
    w < 100 ? 100 : w;
    h < 50 ? 50 : h;

    /** 不允许超出griddingWidth */
    w = w * this.griddingWidth <= this.stageWidth - (x + this.gridMargin) * this.griddingWidth ?
        w : Math.floor(this.stageWidth / this.griddingWidth) - x - this.gridMargin;
    this.draggIng = true;
    this.dragData.x = x;
    this.dragData.y = y;
    this.dragData.w = w;
    this.dragData.h = h;
    this.rearrangement();
    this.RenderIndex++;
  }
  /**
   * Resize end
   */
  gridItemResizeEnd() {
    if (!this.edit) return;
    this.draggIng = false;
    let { x, y, w, h } = this.dragData;
    this.curResizingGridItemData.x = x;
    this.curResizingGridItemData.y = y;
    this.curResizingGridItemData.w = w;
    this.curResizingGridItemData.h = h;
    delete this.curResizingGridItemData.style;
    this.curResizingGridItemData = null;
    this.rearrangement();
    this.transition = false;
    this.RenderIndex++;
    this.saveCurLayout();
  }
  /**
   * ItemStyle事件
   * @param data GridItemData
   * @returns 
   */
  getGridItemStyle(data: GridItemData) {
    if(data.style){
      return `
      transition:none;
      left:${data.style.left}px;
      top:${data.style.top}px;
      z-index:1000;
      width:${data.style.width}px; 
      height:${data.style.height}px`;
    }
    const style = { left: data.x * this.griddingWidth, top: data.y * this.griddingWidth, width: data.w * this.griddingWidth, height: data.h * this.griddingWidth };
    const zIndex = data.id === DRAG_ID ? 9999 : (data.float ? (1000 + data.z||0) : (100 + data.z||0));
    return `
      left:${style.left}px;
      top:${style.top}px;
      z-index:${zIndex};
      width:${style.width}px; 
      height:${style.height}px`;
  }
  /** 保存Layout */
  saveCurLayout() {
    this.dataStoreIndex++;
    this.dataStore[this.dataStoreIndex] = JSON.stringify(this.layoutData);
  }
  /** 移除GridImte */
  gridItemClose(event: PointerEvent) {
    const index = this.getGridItemIndex(event.currentTarget);
    this.layoutData.splice(index, 1);
    this.transition = false;
    this.RenderIndex++;
    this.rearrangement();
    this.RenderIndex++;
  }
  getGridItemIndex(target: any) {
    const grid: HTMLElement | null = target?.closest('.grid-item') || null;
    return Number(grid?.dataset.index || '0');
  }
  getGridItem(target: any) {
    const index = this.getGridItemIndex(target);
    return this.layoutData[index];
  }
  /**
   * 拖拽开始
   * @param event PointerEvent
   * @returns void
   */
  gridItemDragstart(event: PointerEvent) {
    if (!this.edit) return;
    const target:any = event?.target;
    if(target?.closest('.grid-item-close')){
      this.gridItemClose(event);
      return;
    }
    if(target?.closest('.set-float')){
      this.gridItemFloat(event);
      return;
    }
    
    event.preventDefault();
    this.curMovingGridItemData = this.getGridItem(event.currentTarget);
    if (!this.curMovingGridItemData) return;
    const { w, h, x, y, id } = this.curMovingGridItemData;
    this.movePosition = {
      left: this.curMovingGridItemData.x * this.griddingWidth,
      top: this.curMovingGridItemData.y * this.griddingWidth
    };
    this.fixPosition.left = event.clientX;
    this.fixPosition.top = event.clientY;
    this.oldPosition.left = this.movePosition.left;
    this.oldPosition.top = this.movePosition.top;
    this.curMovingGridItemData.z = 100;
    this.layoutData.forEach((item) => {if(item.id !== this.curMovingGridItemData.id) delete item.selected});
    this.curMovingGridItemData.selected = true;
    this.dragData.w = w;
    this.dragData.h = h;
    this.dragData.x = x;
    this.dragData.y = y;
    this.transition = true;
    this.RenderIndex ++;
    const onDragging: any = (event: PointerEvent) => {
      this.curMovingGridItemData.selected = true;
      this.movePosition.left = this.oldPosition.left + (event.clientX - this.fixPosition.left);
      this.movePosition.top = this.oldPosition.top + (event.clientY - this.fixPosition.top);

      if (!this.edit) return;
      this.draggIng = true;

      const { w, h, id } = this.curMovingGridItemData;
      this.dragData.w = w;
      this.dragData.h = h;

      let height = this.curMovingGridItemData.h * this.griddingWidth;
      let width = this.curMovingGridItemData.w * this.griddingWidth;
     
      this.curMovingGridItemData.style = { width, height, left:this.movePosition.left, top:this.movePosition.top }
      const { x, y } = this.calcNearPosition(this.movePosition.left, this.movePosition.top);
      if (this.curMovingGridItemData.float) {
        this.dragData.x = x;
        this.dragData.y = y;
        this.RenderIndex++;
        return;
      }
      const newPos = this.getNearEmptyPosition({ x, y, w, h, id: 0,z:0 });
      if (newPos) {
        this.dragData.x = newPos.x;
        this.dragData.y = newPos.y;
      }
      this.rearrangement();
      this.RenderIndex++;
    };
    const onDragEnd: any = () => {
      if (!this.edit) return;
      this.draggIng = false;
      delete this.curMovingGridItemData.style
      this.curMovingGridItemData.x = this.dragData.x;
      this.curMovingGridItemData.y = this.dragData.y;
      this.curMovingGridItemData.time = new Date().getTime();
      this.curMovingGridItemData.z = 0;
      this.curMovingGridItemData = null;
      this.transition = false;
      this.RenderIndex++;
      this.saveCurLayout();
      document.body.removeAttribute("onselectstart");
      window.removeEventListener("mousemove", onDragging);
      window.removeEventListener("mouseup", onDragEnd);
    }
    document.body.setAttribute("onselectstart", "return false");
    window.addEventListener("mousemove", onDragging);
    window.addEventListener("mouseup", onDragEnd);
  }
  /**
   * 转换成的GidPosition
   * @param left style.left
   * @param top style.top
   * @returns {x,y}
   */
  calcNearPosition = (left: number, top: number): GridPosition => {
    let x = Math.round(left / this.griddingWidth);
    let y = Math.round(top / this.griddingWidth);
    return { x, y };
  }
  
  /**
   * 获取最近的空间
   * @param grid :GridItemData
   * @returns {x,y}
   */
  getNearEmptyPosition(grid: GridItemData) {

    let { w } = grid;
    let { x, y } = this.getMinXY(grid);
    x = x < this.gridMargin ? this.gridMargin : x;
    x = (x + w + this.gridMargin) > Math.floor(this.stageWidth / this.griddingWidth) ?
      Math.floor(this.stageWidth / this.griddingWidth) - this.gridMargin - w : x;
    return { x, y };
  
  }
  
  /**
   * 非邻国
   * @param item 
   */
  isNotNeighbor = (item: GridItemData): boolean => {
    const x1 = Math.min(item.x, this.dragData.x);
    const x2 = Math.max(item.x + item.w, this.dragData.x + this.dragData.w);
    const leftRight = x2 - x1 >= item.w + this.dragData.w + this.gridMargin;

    let y1 = Math.min(item.y, this.dragData.y);
    let y2 = Math.max(item.y + item.h, this.dragData.y + this.dragData.h);
    const upDown = y2 - y1 >= item.h + this.dragData.h + this.gridMargin;

    return leftRight && upDown;
  }
  /** 
   * 是否左右并列
  */
  isNeighborLeftRight = (item: GridItemData): boolean => {
    const x1 = Math.min(item.x, this.dragData.x);
    const x2 = Math.max(item.x + item.w, this.dragData.x + this.dragData.w);
    return x2 - x1 == item.w + this.dragData.w + this.gridMargin;
  }
  /**
   * 是否上下并列
   */
  isNeighborUpDown = (item: GridItemData) => {
    let y1 = Math.min(item.y, this.dragData.y);
    let y2 = Math.max(item.y + item.h, this.dragData.y + this.dragData.h);
    return y2 - y1 == item.h + this.dragData.h + this.gridMargin;
  }
  /**
   * 返回 上次的layout
   * @returns JSON
   */
  getBackLayout = () => {
    this.dataStoreIndex--;
    return this.dataStore[this.dataStoreIndex]
  }
  /**
   * 打开上次的保存layout
   */
  backLayout = () => {
    const data = this.getBackLayout();
    if (data) {
      this.layoutData = JSON.parse(data);
    }
  }
  /** 下一个layout */
  getForwardLayout = () => {
    this.dataStoreIndex = this.dataStore.length - 1 > this.dataStoreIndex ? this.dataStoreIndex + 1 : this.dataStore.length - 1;
    return this.dataStore[this.dataStoreIndex]
  }
  /** 打开下一步的layout */
  forwardLayout = () => {
    const data = this.getForwardLayout();
    if (data) {
      this.layoutData = JSON.parse(data);
    }
  }
  //关闭事件
  close = () => {
    const emit: any = new Event('close');
    emit.detail = this.layoutData;
    this.dispatchEvent(emit);
  }
  //浮动事件
  gridItemFloat = (event: PointerEvent) => {
    const gridItem: GridItemData = this.getGridItem(event?.currentTarget);
    if (gridItem) gridItem.float = !gridItem.float;
    this.RenderIndex ++;
  }
  //GridLayout的点击事件
  onGridLayoutClick (event: any) {
    if(event?.target?.closest(".toolbar")) return;
    if(event?.target?.closest(".grid-item")) return;
    this.layoutData.forEach((item) => {delete item.selected});
    this.RenderIndex ++;
  }
  //获取最小的Y座标
  getMinXY(grid:ItemData){
    let { x, h, w, y } = grid;
    if(y <= this.gridMargin) {
      y = this.gridMargin;
      return {x,y}
    }

    const list = this.findOverlapItem(x, y, w, h,[this.curActiveGridItem.id]);
    const exceptIds = list.map(item => item.id);
    y = this.gridMargin;
    let item:any = this.findBigestOverlapItem(x, y, w, h,[...exceptIds,this.curActiveGridItem.id]);
    // this.calcOverArea(grid,item) >= 6
    while (item){
      y = y + this.gridMargin;
      item = this.findBigestOverlapItem(x, y, w, h, [...exceptIds,this.curActiveGridItem.id]);
    }
    return { x, y };
  }
  //计算交叉点
  calcOverArea(data1:ItemData,data2:ItemData) {
    const overX1 = Math.max(data1.x, data2.x);
    const overX2 = Math.min(data1.x + data1.w, data2.x + data2.w);
    const overW = overX2 - overX1;
    const overY1 = Math.max(data1.y, data2.y);
    const overY2 = Math.min(data1.y + data1.h, data2.y + data1.h);
    const overH = overY2 - overY1;
    const overArea = overH * overW;
    return overArea;
  }
  //整理Item底部重叠的地方
  clearBottomOver(){
    const list = this.layoutData.filter(item => !item.float)
    for(let item of list ){
      let {x,y,w,h,id} = item
      if(this.curActiveGridItem?.id === id){//不允许移动当前Item
        x = this.dragData.x;
        y = this.dragData.y;
        w = this.dragData.w;
        h = this.dragData.h;
      }
      let list = this.findOverlapItem(x, y, w, h, [id]);
      list = list.filter((item:any) => item.id !== this.curActiveGridItem?.id)//不允许移动当前Item
      if(list.length){
        for(let i = 0;i < list.length;i++){
          list[i].y = y + h + this.gridMargin;
        }
        this.clearBottomOver();
        return;
      }
    }
  }
  //移除Item上面的空间
  clearTopSpace(){
    const list = this.layoutData.filter(item => !item.float);
    for(let item of list ){
      let {x,y,w,h,id} = item;
      if(this.curActiveGridItem?.id === id){//不允许移动当前Item
        continue;
      }
      let newY = y - this.gridMargin;
      let hasSpace = false;
      const exceptIds = [id];
      if(this.curActiveGridItem?.id)
        exceptIds.push(this.curActiveGridItem.id);
      while(newY >= this.gridMargin &&  !this.findBigestOverlapItem(x,newY,w,h,exceptIds)){
        item.y = newY;
        newY = item.y - this.gridMargin;
        hasSpace = true
      }
      if(hasSpace){
        this.clearTopSpace();
        return;
      }
    }
    
  }
  //重新排序
  rearrangement(){
    this.clearTopSpace();
    this.clearBottomOver();
  }
  setZindexUp(){
    if(this.curSelectGridItem?.float){
      this.curSelectGridItem.z ++;
      this.RenderIndex++;
    }
  }
  setZindexDown(){
    if(this.curSelectGridItem?.float){
      this.curSelectGridItem.z --;
      this.RenderIndex++;
    }
  }
  //当前活动的GridItem
  get curActiveGridItem(){
    return this.curMovingGridItemData || this.curResizingGridItemData || null;
  }
  //当前活动的GridItem style
  get curActiveGridItemStyle(){
    return this.curActiveGridItem?.style;
  }
  get curSelectGridItem():GridItemData|undefined{
    return this.layoutData.find(item => item.selected)
  }
  // connectedCallback(){
  //   // 

  // }
  // disconnectedCallback(){
  // }
  render() {
    this.stageWidth = this.getBoundingClientRect().width;
    return html`<div class="grid-layout" @click="${this.onGridLayoutClick}">
    <div class="grid-sitting" style="'height:${this.stageHeight}px'"></div>
    ${this.edit ? html`
      <div class="toolbar">
        <div style="margin-right:20px;display:${this.curSelectGridItem?.float?'flex':'none'}">
          <i class="el-icon add" @click="${this.setZindexUp}" >
            <!--[-->
              <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" data-v-ea893728=""><path fill="currentColor" d="M572.235 205.282v600.365a30.118 30.118 0 1 1-60.235 0V205.282L292.382 438.633a28.913 28.913 0 0 1-42.646 0 33.43 33.43 0 0 1 0-45.236l271.058-288.045a28.913 28.913 0 0 1 42.647 0L834.5 393.397a33.43 33.43 0 0 1 0 45.176 28.913 28.913 0 0 1-42.647 0l-219.618-233.23z"></path></svg>
            <!--]-->
          </i>
          <i class="el-icon back" @click="${this.setZindexDown}">
            <!--[-->
              <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" data-v-ea893728=""><path fill="currentColor" d="M544 805.888V168a32 32 0 1 0-64 0v637.888L246.656 557.952a30.72 30.72 0 0 0-45.312 0 35.52 35.52 0 0 0 0 48.064l288 306.048a30.72 30.72 0 0 0 45.312 0l288-306.048a35.52 35.52 0 0 0 0-48 30.72 30.72 0 0 0-45.312 0L544 805.824z"></path></svg>
            <!--]-->
          </i>
        </div>
        <i class="el-icon add" @click="${this.addGridItem}" >
          <!--[-->
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" data-v-ea893728=""><path fill="currentColor" d="M480 480V128a32 32 0 0 1 64 0v352h352a32 32 0 1 1 0 64H544v352a32 32 0 1 1-64 0V544H128a32 32 0 0 1 0-64h352z"></path></svg>
          <!--]-->
        </i>
        <i class="el-icon back" @click="${this.backLayout}">
          <!--[-->
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-reply" viewBox="0 0 16 16">
            <path d="M6.598 5.013a.144.144 0 0 1 .202.134V6.3a.5.5 0 0 0 .5.5c.667 0 2.013.005 3.3.822.984.624 1.99 1.76 2.595 3.876-1.02-.983-2.185-1.516-3.205-1.799a8.74 8.74 0 0 0-1.921-.306 7.404 7.404 0 0 0-.798.008h-.013l-.005.001h-.001L7.3 9.9l-.05-.498a.5.5 0 0 0-.45.498v1.153c0 .108-.11.176-.202.134L2.614 8.254a.503.503 0 0 0-.042-.028.147.147 0 0 1 0-.252.499.499 0 0 0 .042-.028l3.984-2.933zM7.8 10.386c.068 0 .143.003.223.006.434.02 1.034.086 1.7.271 1.326.368 2.896 1.202 3.94 3.08a.5.5 0 0 0 .933-.305c-.464-3.71-1.886-5.662-3.46-6.66-1.245-.79-2.527-.942-3.336-.971v-.66a1.144 1.144 0 0 0-1.767-.96l-3.994 2.94a1.147 1.147 0 0 0 0 1.946l3.994 2.94a1.144 1.144 0 0 0 1.767-.96v-.667z"/>
          </svg>
          <!--]-->
        </i>
        <i class="el-icon forward" @click="${this.forwardLayout}">
          <!--[-->
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-reply" viewBox="0 0 16 16">
            <path d="M6.598 5.013a.144.144 0 0 1 .202.134V6.3a.5.5 0 0 0 .5.5c.667 0 2.013.005 3.3.822.984.624 1.99 1.76 2.595 3.876-1.02-.983-2.185-1.516-3.205-1.799a8.74 8.74 0 0 0-1.921-.306 7.404 7.404 0 0 0-.798.008h-.013l-.005.001h-.001L7.3 9.9l-.05-.498a.5.5 0 0 0-.45.498v1.153c0 .108-.11.176-.202.134L2.614 8.254a.503.503 0 0 0-.042-.028.147.147 0 0 1 0-.252.499.499 0 0 0 .042-.028l3.984-2.933zM7.8 10.386c.068 0 .143.003.223.006.434.02 1.034.086 1.7.271 1.326.368 2.896 1.202 3.94 3.08a.5.5 0 0 0 .933-.305c-.464-3.71-1.886-5.662-3.46-6.66-1.245-.79-2.527-.942-3.336-.971v-.66a1.144 1.144 0 0 0-1.767-.96l-3.994 2.94a1.147 1.147 0 0 0 0 1.946l3.994 2.94a1.144 1.144 0 0 0 1.767-.96v-.667z"/>
          </svg>
          <!--]-->
        </i>
        <i class="el-icon save" @click="${this.saveCurLayout}">
          <!--[-->
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16">
            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
          </svg>
          <!--]-->
        </i>
        <i class="el-icon close" @click="close()">
          <!--[-->
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" data-v-ea893728=""><path fill="currentColor" d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.184z"></path></svg>
          <!--]-->
        </i>
      </div>`:''
    }
    
    ${this.layoutData.map((item, i) => {
      return html`
      <div class="grid-item"  data-index="${i}" .griddingWidth="${this.griddingWidth}"
        selected="${item.selected}"
        float="${item.float}"
        @mousedown="${this.gridItemDragstart}"
        style="${this.getGridItemStyle(item)}"
        transition="${this.transition}"
        >
        <slot name="${item.slot || ''}"></slot>
        <div class="tool-box">
          <i class="el-icon set-float" @click="{this.gridItemFloat}">
            <!--[-->
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-subtract" viewBox="0 0 16 16">
              <path d="M0 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
            </svg>
            <!--]-->
          </i>
          <i @click="{this.gridItemClose}" class="el-icon close grid-item-close" style="font-size:20px;" >
            <!--[-->
            <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.184z"></path></svg>
            <!--]-->
          </i>
        </div>
        <div class="resize bottom-right" @mousedown="${this.gridItemResizeStart}" ></div>
      </div>
      
      `
    })}
    ${this.draggIng ? this.drawDragDataHtml():''}

  </div>
    `;
  }
  static styles = css`
  :host {
    display: block;
    padding: 0px;
    height:100%;
  }
  .grid-layout {
    position: relative;
    width: 100%;
    height: 100%;
    overflow-x: hidden;
  }
  .toolbar{
    position: absolute;
    right:5px;
    top:5px;
    padding:2px;
    z-index: 9999;
    display:flex;
  }
  .toolbar .el-icon svg{
    width:18px;
    height: 18px;
  }
  .toolbar .el-icon {
    cursor: pointer;
    margin:0px 3px;
    border:1px solid #dbdbdb;
    border-radius: 3px;
    padding: 3px;
    display: inline-flex;
    width: 18px;height: 18px;
    background-color: #fff;
  }
  .toolbar .el-icon:hover {
    background-color: #4097e4;
    color:#fff;
  }
  .toolbar .el-icon.forward svg{
    transform: scaleX(-1);
  }
  .old-data {
    opacity: 0.3;
  }
  .grid-sitting{
    width:100%;
    top:0px;
    position: absolute;
    z-index:-1
  }  
  .grid-item {
    display:block;
    position:absolute;
    min-width: 80px;
    min-height: 50px;
    border-radius: 3px;
    overflow:hidden;
    background-color:#fff;
    border:1px solid #c3c3c3;
    box-sizing: border-box;
  }
  .grid-item[transition="true"] {
    transition: all 0.3s;
  }
  .grid-item.move {
    cursor:move;
  }
  .grid-item[selected="true"] {
    box-shadow: 0px 0px 6px -2px rgb(48 47 51);
    transition: none;
  }
  .grid-item[float="true"]{
    border:1px solid #3250a7;
  }
  .grid-item[float="true"] .tool-box .set-float{
    opacity: 1;
    color:#3250a7;
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
   border-right: 3px solid #c3bebe;
   border-bottom: 3px solid #c3bebe;
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
   transition: none;
 }
 .grid-item[drag=true] .close,
 .grid-item[drag=true] .set-float{
   display: none;
 }
 .resize{
   position: absolute;
 }
`;
}
