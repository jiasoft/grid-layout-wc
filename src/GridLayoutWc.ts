import { html, css, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';
interface ItemData {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface GridItemStyleTyoe { left: number; top: number; width: number; height: number }
type CSSType = {
  borderWidth?:string;
  borderColor?:string;
  borderStyle?:string;
  backgroundColor?:string;
  borderRadius?:string;
}
interface GridItemData extends ItemData {
  id: number;
  z: number;
  selected?: boolean;
  dataSource?: any;
  time?: number;
  title?: string;
  float?: boolean;
  slot?: string;
  style?: GridItemStyleTyoe
  userStyle?:CSSType
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
  static stylemap:CSSType = { borderWidth:'1', borderColor:'', borderStyle:'', backgroundColor:'' };
  @property({ type: Number }) griddingWidth = 10;
  @property({ type: Number }) gridMargin = 1;
  @property({ type: Boolean }) edit = false;
  @property({ type: Array }) layoutData: GridItemData[] = [];
  oldLayoutData:string = "";
  styleMapEditing:boolean = false;
  dragData = { x: 0, y: 0, w: 60, h: 60, z: 0, id: DRAG_ID };
  draggIng: boolean = false;
  // stageHeight: number = 0;
  stageWidth: number = 1000;

  /** resize相关 */
  resizeFixPosition: any = { top: 0, left: 0 };
  resizeingPosition: any = { top: 0, left: 0 };
  resizeFixGridItemData:GridItemData|null = null;
  curResizingGridItemData: any | null = null;
  
  dataStore: any[] = [];
  dataStoreIndex: number = 0;
  curMovingGridItemData: any | null = null;
  movePosition: HtmlPosition = { left: 0, top: 0 };
  fixPosition: HtmlPosition = { left: 0, top: 0 };
  oldPosition: HtmlPosition = { left: 0, top: 0 };
  transition: boolean = false;
  reRender(){
    this.RenderIndex ++;
  }
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
    this.reRender();
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
    let item = this.findBigestOverlapItem(this.layoutData, x, y, w, h);
    while (item) {
      x = item.x + item.w + this.gridMargin;
      if ((x + this.gridMargin) * this.griddingWidth + w * this.griddingWidth > this.stageWidth) {
        y += this.gridMargin;
        x = this.gridMargin;
      }
      item = this.findBigestOverlapItem(this.layoutData, x, y, w, h);
    }
    return { x, y };
  }
  /**
   * 查找存在的最大的重叠交叉项
   * */
  findBigestOverlapItem = (dataList:GridItemData[],x: number, y: number, w: number, h: number, exceptIds?: any[]): GridItemData | undefined => {
    const list = this.findOverlapItem(dataList,x, y, w, h, exceptIds);
    let BigestOverlapArea = -99999999999; //最大的重叠交叉面积
    let BigestOverlapItem: any = undefined;
    list.forEach((item: any) => {
      let curItemX = item.x;
      let curItemY = item.y;
      let curItemW = item.w;
      let curItemH = item.h;
      // if (this.curActiveGridItem && this.curActiveGridItem.id === item.id && this.dragData) {
      //   curItemX = this.dragData.x;
      //   curItemY = this.dragData.y;
      //   curItemW = this.dragData.w;
      //   curItemH = this.dragData.h;
      // }
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
  findOverlapItem = (dataList:GridItemData[],x: number, y: number, w: number, h: number, exceptIds?: any[], overCount:number = 0): GridItemData[] => {
   
    const list: GridItemData[] = [];
    let data = dataList.filter((item: any) => !item.float);
    if(this.curActiveGridItem && this.dragData ) {
      if(!data.find(item => item.id ===this.dragData.id)){
        data = [...data,this.dragData]
      }
      
    }
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      if (exceptIds && exceptIds.indexOf(item.id) >= 0) {
        continue;
      }
      let curItemX = item.x;
      let curItemY = item.y;
      let curItemW = item.w;
      let curItemH = item.h;
      let x1 = Math.min(curItemX, x);
      let x2 = Math.max(curItemX + curItemW, x + w);


      let y1 = Math.min(curItemY, y);
      let y2 = Math.max(curItemY + curItemH, y + h);

      //是否存在交叉的算法
      if (((x2 - x1) - (curItemW + w) + overCount) < this.gridMargin &&
        ((y2 - y1) - (curItemH + h) + overCount) < this.gridMargin ) {
        list.push(item);
      }
    }
    return list;
  }
  /**
   * Resize start
   * @param event MouseEvent
   */
  gridItemResizeStart(event: MouseEvent) {
    if (!this.edit) return;
    event.preventDefault();
    event.stopPropagation();

    const index = this.getGridItemIndex(event.currentTarget);
    this.curResizingGridItemData = this.layoutData[index];
    this.resizeFixGridItemData = {...this.layoutData[index]};
    this.resizeFixPosition.left = event.clientX;
    this.resizeFixPosition.top = event.clientY;
    this.resizeingPosition.left = event.clientX;
    this.resizeingPosition.top = event.clientY;
    this.transition = true;
    this.reRender();
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
    if(!this.resizeFixGridItemData) return;
    let w = this.resizeFixGridItemData?.w + Math.round((this.resizeingPosition.left - this.resizeFixPosition.left) / this.griddingWidth);
    let h = this.resizeFixGridItemData?.h + Math.round((this.resizeingPosition.top - this.resizeFixPosition.top) / this.griddingWidth);
    let x = this.resizeFixGridItemData?.x;
    let y = this.resizeFixGridItemData?.y;
    let z = this.resizeFixGridItemData?.z;

    if (this.curResizingGridItemData.float) {
      this.draggIng = true;
      this.dragData.x = x;
      this.dragData.y = y;
      this.dragData.w = w;
      this.dragData.h = h;
      this.dragData.z = z;
      this.curResizingGridItemData.style = { width:w * this.griddingWidth, height:h* this.griddingWidth, left: x * this.griddingWidth, top: y * this.griddingWidth };
      this.reRender();
      return;
    }
    let height = this.resizeFixGridItemData.h * this.griddingWidth + (this.resizeingPosition.top - this.resizeFixPosition.top)
    let width = this.resizeFixGridItemData.w * this.griddingWidth + (this.resizeingPosition.left - this.resizeFixPosition.left);
    if (width > this.stageWidth - x * this.griddingWidth) {
      width = this.stageWidth - x * this.griddingWidth;
    }
    this.curResizingGridItemData.style = { width, height, left: x * this.griddingWidth, top: y * this.griddingWidth };
    
    /** 不允许超出griddingWidth */
    w = w * this.griddingWidth <= this.stageWidth - (x + this.gridMargin) * this.griddingWidth ?
      w : Math.floor(this.stageWidth / this.griddingWidth) - x - this.gridMargin;
    
    w = w < 8 ? 8 : w;
    h = h < 3 ? 3 : h;
    this.draggIng = true;
    this.dragData.x = x;
    this.dragData.y = y;
    this.dragData.w = w;
    this.dragData.h = h;
    this.rearrangement();
    this.reRender();
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
    this.reRender();
    this.saveCurLayout();
  }
  /**
   * ItemStyle事件
   * @param data GridItemData
   * @returns 
   */
  getGridItemStyle(data: GridItemData) {
    const ActiveZindex = 10000;
    const DragZInxex = 9999;
    const FloatZindex = 100000;
    const css:string[] =[];
    if(data.userStyle){
      const attr:string[] = [];
      if(data.userStyle.borderWidth) attr.push(`border-width:${data.userStyle.borderWidth}px;`);
      if(data.userStyle.borderStyle) attr.push(`border-style:${data.userStyle.borderStyle};`);
      if(data.userStyle.borderColor) attr.push(`border-color:${data.userStyle.borderColor};`);
      if(data.userStyle.borderRadius) attr.push(`border-radius:${data.userStyle.borderRadius}px;`);
      if(data.userStyle.backgroundColor) attr.push(`background-color:${data.userStyle.backgroundColor};`);
      css.push(`
        ${attr.join('')}
      `)
    }
    if (data.style) {
      css.push(`
      transition:none;
      left:${data.style.left}px;
      top:${data.style.top}px;
      z-index:${data.float ? FloatZindex + (data.z || 0) : ActiveZindex};
      width:${data.style.width}px; 
      height:${data.style.height}px`)
      return css.join('');
    }
    const style = { left: data.x * this.griddingWidth, top: data.y * this.griddingWidth, width: data.w * this.griddingWidth, height: data.h * this.griddingWidth };
    let zIndex = data.z || 0;
    if (data.id === DRAG_ID) zIndex = DragZInxex;
    if (data.float) zIndex = FloatZindex + (data.z || 0);

    css.push(`
      left:${style.left}px;
      top:${style.top}px;
      z-index:${zIndex};
      width:${style.width}px; 
      height:${style.height}px;`
    );
    
    return css.join('');
  }
  /** 保存Layout */
  saveCurLayout() {
    let jsonstr = JSON.stringify(this.layoutData);
    let json = JSON.stringify(JSON.parse(jsonstr).map((item:any) => {
      delete item.time;
      delete item.selected;
      return item;
    }));
    if (json != this.dataStore[this.dataStoreIndex]) {
        this.dataStoreIndex++;
        this.dataStore[this.dataStoreIndex] = json;
    }
  }
  animateGridItem(item:GridItemData,w:number=3,h:number=2) {
    return new Promise(resolve => {
      const minusW = (item.w - w) / 5;
      const minusH = (item.h - h) / 5;
      const animate = ()=> {
        item.w -= minusW;
        item.h -= minusH;
        if(item.w < w){
          item.w = w;
        }
        if(item.h < h){
          item.h = h;
        }
        this.rearrangement();
        this.reRender();
        if(item.w > w || item.h > h){
          window.requestAnimationFrame(()=>{animate()})
        } else {
          resolve(null);
        }
        
      }
      animate();
    })
   
  }
  /** 移除GridItem */
  async gridItemClose(event: PointerEvent) {
    const index = this.getGridItemIndex(event.currentTarget);
    const item:GridItemData = this.layoutData[index]

    await this.animateGridItem(item,3,3);
    this.layoutData.splice(index,1);
    this.transition = false;
    this.rearrangement();
    this.reRender();
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
    const target: any = event?.target;
    if (target?.closest('.grid-item-close')) {
      this.styleMapEditing = false;
      this.gridItemClose(event);
      return;
    }
    if (target?.closest('.set-float')) {
      this.gridItemFloat(event);
      return;
    }

    event.preventDefault();
    const grid = this.getGridItem(event.currentTarget);
    if(this.curSelectGridItem && this.curSelectGridItem.id !== grid.id){
      this.styleMapEditing = false;
    }
    this.curMovingGridItemData = grid;
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
    this.layoutData.forEach((item) => { if (item.id !== this.curMovingGridItemData.id) delete item.selected });
    this.curMovingGridItemData.selected = true;
    this.dragData.w = w;
    this.dragData.h = h;
    this.dragData.x = x;
    this.dragData.y = y;
    this.transition = true;
    this.oldLayoutData = JSON.stringify(this.layoutData);
    this.reRender();
    const onDragging: any = (event: PointerEvent) => {
      if(!this.curMovingGridItemData) return;
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

      this.curMovingGridItemData.style = { width, height, left: this.movePosition.left, top: this.movePosition.top }
      const { x, y } = this.calcNearPosition(this.movePosition.left, this.movePosition.top);
      if (this.curMovingGridItemData.float) {
        this.dragData.x = x;
        this.dragData.y = y;
        this.reRender();
        return;
      }
      const newPos = this.getNearEmptyPosition({ x, y, w, h, id: 0, z: 0 });
      if (newPos) {
        this.dragData.x = newPos.x;
        this.dragData.y = newPos.y;
      }
      this.rearrangement();
      this.reRender();
    };
    const onDragEnd: any = () => {
      if (!this.edit) return;
      this.draggIng = false;
      if(!this.curMovingGridItemData) return;
      delete this.curMovingGridItemData.style
      this.curMovingGridItemData.x = this.dragData.x;
      this.curMovingGridItemData.y = this.dragData.y;
      this.curMovingGridItemData.time = new Date().getTime();
      this.curMovingGridItemData = null;
      this.transition = false;
      this.oldLayoutData = "";
      this.reRender();
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
    const overMax = 10;
    let { x,y,w,h} = grid;
    if(y < this.gridMargin) y = this.gridMargin;
    if(x < this.gridMargin) x = this.gridMargin;
    x = x < this.gridMargin ? this.gridMargin : x;
    x = (x + w + this.gridMargin) > Math.floor(this.stageWidth / this.griddingWidth) ?
      Math.floor(this.stageWidth / this.griddingWidth) - this.gridMargin - w : x;
    const overList = this.findOverlapItem(this.layoutData,x,y,w,h,[this.dragData.id,this.curActiveGridItem.id]);
    overList.forEach( overItem => {
      let overW = w + overItem.w - (Math.max(x + w , overItem.x + overItem.w) - Math.min(x , overItem.x));
      let overH = h + overItem.h - (Math.max(y + h , overItem.y + overItem.h) - Math.min(y , overItem.y));
      if( overH < overW){
        if( overH < overMax && overH < overItem.h && overH < h) {
          if(y < overItem.y)  y = overItem.y - h - this.gridMargin;
          else y = overItem.y + overItem.h + this.gridMargin ;
        }
      }else {
        if( overW < overMax && overW < overItem.w && overW < w) {
          if(x < overItem.x)  x = overItem.x - w - this.gridMargin;
          else return x =overItem.x + overItem.w + this.gridMargin;
        }
      }
    });
    return { x, y };
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
  save = () => {
    const emit: any = new Event('save');
    emit.detail = this.layoutData;
    this.dispatchEvent(emit);
  }
  //浮动事件
  gridItemFloat = (event: PointerEvent) => {
    const gridItem: GridItemData = this.getGridItem(event?.currentTarget);
    if (gridItem) {
      gridItem.float = !gridItem.float;
      let z = 0;
      this.layoutData.filter(item => item.float).forEach(item => { z = z < item.z ? item.z : z});
      if(gridItem.float){
        
        gridItem.z = z + 1;
      }else {
        gridItem.z = 0;
      }
    }
    this.reRender();
  }
  //GridLayout的点击事件
  onGridLayoutClick(event: any) {
    if (event?.target?.closest(".toolbar")) return;
    if (event?.target?.closest(".grid-item")) return;
    if (event?.target?.closest("[slot]")) return;
    this.layoutData.forEach((item) => { delete item.selected });
    this.styleMapEditing = false;
    this.reRender();
  }

  //获取GridItem的TOP y座标
  getGridItemTopY(dataList:GridItemData[], grid: ItemData,exceptIds:any[]) {
    let { x, h, w, y } = grid;
    let item: any = this.findBigestOverlapItem(dataList,x, y - this.gridMargin, w, h, exceptIds);
    while (!item) {
      y = y - this.gridMargin;
      if (y <= this.gridMargin) {
        y = this.gridMargin;
        return { x, y }
      }
      item = this.findBigestOverlapItem(dataList,x, y - this.gridMargin, w, h, exceptIds);
    }
    return { x, y };
  }
  //计算交叉点
  calcOverArea(data1: ItemData, data2: ItemData) {
    const overX1 = Math.max(data1.x, data2.x);
    const overX2 = Math.min(data1.x + data1.w, data2.x + data2.w);
    const overW = overX2 - overX1;
    const overY1 = Math.max(data1.y, data2.y);
    const overY2 = Math.min(data1.y + data1.h, data2.y + data1.h);
    const overH = overY2 - overY1;
    const overArea = overH * overW;
    return overArea;
  }
  changeInput(attr: "borderStyle" | "borderColor" | "borderWidth" | "backgroundColor" | "borderRadius", e:any){
    if(this.curSelectGridItemUserStyle){
      this.curSelectGridItemUserStyle[attr] = e.currentTarget.value;
      this.reRender();
    }
  }
  //排序上面有空白的地方
  sortTopSpace(list:GridItemData[]) {
    let maxWidth = Math.round(this.stageWidth / this.griddingWidth);
    let maxHeight = Math.round(this.stageHeight / this.griddingWidth);

    for(let sx = this.gridMargin; sx < maxWidth; sx += this.griddingWidth){
      for(let sy = this.gridMargin; sy < maxHeight; sy += this.griddingWidth){
        let w = this.griddingWidth;
        let h = this.griddingWidth;
        let item = this.findBigestOverlapItem(list, sx, sy, w, h, [this.curActiveGridItem?.id]);
        if(item) {
          let {x,y} = this.getGridItemTopY(list,item,[this.curActiveGridItem?.id,item.id]);
          item.x = x;
          item.y = y;
          sy = item.y + item.h;
        }
      }
    }
  }
  //排序底部重叠的地方
  sortBottomOver(list:GridItemData[]) {
   
    for (let item of list) {
      if(item.float) {
        continue
      }
      if(this.curMovingGridItemData?.id === item.id) {
        continue
      }
      this.pressDownOver(list,item);
    }
  }
  //往下压
  pressDownOver(list:GridItemData[], item:GridItemData){
    let {id,x,y,w,h} = item;
    let newList = this.findOverlapItem(list,x, y, w, h, [id, this.dragData?.id, this.curActiveGridItem?.id]);
     
      if (newList.length) {
        for (let i = 0; i < newList.length; i++) {
          newList[i].y = y + h + this.gridMargin;
          this.pressDownOver(list,newList[i]);
        }
        
      }
  }
  
  //重新排序
  rearrangement(){

    let list = [...this.layoutData];
    if(this.curActiveGridItem){
      list = [...list,this.dragData]
    }
    this.sortBottomOver(list);
    this.sortTopSpace(list);

    this.layoutData = list.filter(item => {
      if(item.id === DRAG_ID){
        this.dragData = item;
        return false;
      }
      return true
    }).map(item => {
      if(item.id === this.curActiveGridItem?.id){
        return this.curActiveGridItem;
      }
      return item;
    })
    this.reRender();
  }
  //向上
  setZindexUp() {
    if (!this.curSelectGridItem?.float) { 
      return
    }
    let floatGridItems = this.layoutData.filter(item => item.float);
    floatGridItems = floatGridItems.sort((a:any,b:any)=> a.z - b.z);
    floatGridItems.forEach((item,i) => {
      item.z = i
    });
    let index = floatGridItems.findIndex((item) => item.id === this.curSelectGridItem?.id);
    if(index >=  floatGridItems.length -1) return;
    const item = floatGridItems.splice(index,1);
    floatGridItems.splice(index + 1,0,item[0]);
    floatGridItems.forEach((item,i) => {
      item.z = i
    });
    this.reRender();
  }
  //向下
  setZindexDown() {
    if (!this.curSelectGridItem?.float) { 
      return
    }
    let floatGridItems = this.layoutData.filter(item => item.float);
    floatGridItems = floatGridItems.sort((a:any,b:any)=> a.z - b.z);
    floatGridItems.forEach((item,i) => {
      item.z = i
    });
    let index = floatGridItems.findIndex((item) => item.id === this.curSelectGridItem?.id);
    if(index === 0) return;
    const item = floatGridItems.splice(index,1);
    floatGridItems.splice(index - 1,0,item[0]);
    floatGridItems.forEach((item,i) => {
      item.z = i
    });
    this.reRender();;
  }
  openSetStyle(){
    if(!this.curSelectGridItem) return;
    if(!this.curSelectGridItem.userStyle){
      this.curSelectGridItem.userStyle = {
        borderWidth:'1',
        borderColor:"",
        borderStyle:"",
        backgroundColor:""
      }
    }
    
    this.styleMapEditing = !this.styleMapEditing;
    this.reRender();
  }
  //当前活动的GridItem
  get curActiveGridItem() {
    return this.curMovingGridItemData || this.curResizingGridItemData || null;
  }
  //当前活动的GridItem style
  get curActiveGridItemStyle() {
    return this.curActiveGridItem?.style;
  }
  get curSelectGridItem(): GridItemData | undefined {
    return this.layoutData.find(item => item.selected)
  }
  //选中的UserStyle;
  get curSelectGridItemUserStyle(): CSSType | undefined {
    if(!this.curSelectGridItem) return;
    if(!this.curSelectGridItem.userStyle) {
      this.curSelectGridItem.userStyle = {
        borderStyle: "",
        borderWidth: "",
        borderColor: "",
        borderRadius: "",
        backgroundColor: ""
      }
    }
    return this.curSelectGridItem.userStyle;
  }
  get stageHeight(): number{
    let list = [...this.layoutData]
    if(this.dragData){
      list = [this.dragData,...list];
    }
    let h = 0;
    list.forEach(item => {
      h = h < item.y + item.h?item.y + item.h:h;
    })
    h = h + this.gridMargin;
    return h * this.griddingWidth;
  }
  connectedCallback() {
    super.connectedCallback();
  }
  render() {
    
    this.stageWidth = this.getBoundingClientRect().width;
    return html`<div class="grid-layout" @click="${this.onGridLayoutClick}">
    <div class="grid-sitting" style="height:${this.stageHeight}px"></div>
    ${this.edit ? html`
      <div class="toolbar" >
        <i class="el-icon add" @click="${this.addGridItem}" >
          <!--[-->
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M480 480V128a32 32 0 0 1 64 0v352h352a32 32 0 1 1 0 64H544v352a32 32 0 1 1-64 0V544H128a32 32 0 0 1 0-64h352z"></path>
          </svg>
          <!--]-->
        </i>
        <i class="el-icon back" @click="${this.backLayout}">
          <!--[-->
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-reply" viewBox="0 0 16 16">
            <path d="M6.598 5.013a.144.144 0 0 1 .202.134V6.3a.5.5 0 0 0 .5.5c.667 0 2.013.005 3.3.822.984.624 1.99 1.76 2.595 3.876-1.02-.983-2.185-1.516-3.205-1.799a8.74 8.74 0 0 0-1.921-.306 7.404 7.404 0 0 0-.798.008h-.013l-.005.001h-.001L7.3 9.9l-.05-.498a.5.5 0 0 0-.45.498v1.153c0 .108-.11.176-.202.134L2.614 8.254a.503.503 0 0 0-.042-.028.147.147 0 0 1 0-.252.499.499 0 0 0 .042-.028l3.984-2.933zM7.8 10.386c.068 0 .143.003.223.006.434.02 1.034.086 1.7.271 1.326.368 2.896 1.202 3.94 3.08a.5.5 0 0 0 .933-.305c-.464-3.71-1.886-5.662-3.46-6.66-1.245-.79-2.527-.942-3.336-.971v-.66a1.144 1.144 0 0 0-1.767-.96l-3.994 2.94a1.147 1.147 0 0 0 0 1.946l3.994 2.94a1.144 1.144 0 0 0 1.767-.96v-.667z" />
          </svg>
          <!--]-->
        </i>
        <i class="el-icon forward" @click="${this.forwardLayout}">
          <!--[-->
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-reply" viewBox="0 0 16 16">
            <path d="M6.598 5.013a.144.144 0 0 1 .202.134V6.3a.5.5 0 0 0 .5.5c.667 0 2.013.005 3.3.822.984.624 1.99 1.76 2.595 3.876-1.02-.983-2.185-1.516-3.205-1.799a8.74 8.74 0 0 0-1.921-.306 7.404 7.404 0 0 0-.798.008h-.013l-.005.001h-.001L7.3 9.9l-.05-.498a.5.5 0 0 0-.45.498v1.153c0 .108-.11.176-.202.134L2.614 8.254a.503.503 0 0 0-.042-.028.147.147 0 0 1 0-.252.499.499 0 0 0 .042-.028l3.984-2.933zM7.8 10.386c.068 0 .143.003.223.006.434.02 1.034.086 1.7.271 1.326.368 2.896 1.202 3.94 3.08a.5.5 0 0 0 .933-.305c-.464-3.71-1.886-5.662-3.46-6.66-1.245-.79-2.527-.942-3.336-.971v-.66a1.144 1.144 0 0 0-1.767-.96l-3.994 2.94a1.147 1.147 0 0 0 0 1.946l3.994 2.94a1.144 1.144 0 0 0 1.767-.96v-.667z" />
          </svg>
          <!--]-->
        </i>
        <i class="el-icon save" @click="${this.save}">
          <!--[-->
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16">
            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
          </svg>
          <!--]-->
        </i>
        <i class="el-icon close" @click="${this.close}">
          <!--[-->
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.184z"></path></svg>
          <!--]-->
        </i>
        
      </div>
      
      <div style="top:calc(40% + ${this.shadowRoot?.host.scrollTop}px);display:${this.curSelectGridItem ? 'flex' : 'none'}"  class="toolbar vertical">
      <i class="el-icon z-index-up" @click="${this.setZindexUp}" style="display:${this.curSelectGridItem?.float ? 'flex' : 'none'}">
        <!--[-->
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M572.235 205.282v600.365a30.118 30.118 0 1 1-60.235 0V205.282L292.382 438.633a28.913 28.913 0 0 1-42.646 0 33.43 33.43 0 0 1 0-45.236l271.058-288.045a28.913 28.913 0 0 1 42.647 0L834.5 393.397a33.43 33.43 0 0 1 0 45.176 28.913 28.913 0 0 1-42.647 0l-219.618-233.23z"></path></svg>
        <!--]-->
      </i>
      <i class="el-icon z-index-down" @click="${this.setZindexDown}" style="display:${this.curSelectGridItem?.float ? 'flex' : 'none'}">
        <!--[-->
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M544 805.888V168a32 32 0 1 0-64 0v637.888L246.656 557.952a30.72 30.72 0 0 0-45.312 0 35.52 35.52 0 0 0 0 48.064l288 306.048a30.72 30.72 0 0 0 45.312 0l288-306.048a35.52 35.52 0 0 0 0-48 30.72 30.72 0 0 0-45.312 0L544 805.824z"></path></svg>
        <!--]-->
      </i>
      <div class="style-box">
        ${this.renderStyleSet()}
        <i class="el-icon style-update-btn"  @click="${this.openSetStyle}" active="${this.styleMapEditing}">
          <!--[-->
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-border-style" viewBox="0 0 16 16">
              <path d="M1 3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-1zm0 4a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-1zm0 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm8 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-4 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm8 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-4-4a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-1z" />
            </svg>
          <!--]-->
        </i>
      </div>
    </div>
    `: ''
    }
    
    ${this.layoutData.map((item, i) => {
      return html`
      <div class="grid-item"  data-index="${i}" .griddingWidth="${this.griddingWidth}"
        selected="${item.selected||false}"
        float="${item.float||false}"
        edit="${this.edit}"
        @mousedown="${this.gridItemDragstart}"
        style="${this.getGridItemStyle(item)}"
        transition="${this.transition}"
        >
        <slot name="${item.slot || ''}"></slot>
        ${this.renderToobar()}
      </div>
      `
    })}
    ${this.draggIng ? this.drawDragDataHtml() : ''}
  </div>
    `;
  }
  renderStyleSet() {
    return this.styleMapEditing ? html`
    <div class="style-set">
      <div class="head">Style</div>
      <div class="item">
        <span class="lab">border-width:</span>
        <div class="ctr">
          <input class="ctr-input" type="number" min="0" max="10"
            value="${this.curSelectGridItemUserStyle?.borderWidth||0}"
            @change="${(e:any)=>{this.changeInput('borderWidth',e)}}" />
        </div>
      </div>
      <div class="item">
        <span class="lab">border-style:</span>
        <div class="ctr">
          <select class="ctr-input" 
            value="${this.curSelectGridItemUserStyle?.borderStyle||''}"
            @change="${(e:any)=>{this.changeInput('borderStyle',e)}}">
            <option value=""></option>
            <option value="solid">solid</option>
            <option value="dotted">dotted</option>
            <option value="double">double</option>
            <option value="dashed">dashed</option>
            <option value="hidden">hidden</option>
            <option value="inset">inset</option>
            <option value="outset">outset</option>
            <option value="ridge">ridge</option>    
            <option value="none">none</option>
          </select>
        </div>
      </div>
      <div class="item">
        <span class="lab">border-color:</span>
        <div class="ctr">
          <input class="ctr-input"  type="color"
          value="${this.curSelectGridItemUserStyle?.borderColor||''}" 
          @change="${(e:any)=>{this.changeInput('borderColor',e)}}" />
        </div>
      </div>
      <div class="item">
        <span class="lab">border-radius:</span>
        <div class="ctr">
          <input class="ctr-input"  type="number" min="0" max="10"
          value="${this.curSelectGridItemUserStyle?.borderRadius||''}" 
          @change="${(e:any)=>{this.changeInput('borderRadius',e)}}" />
        </div>
      </div>
      <div class="item">
        <span class="lab">background-color:</span>
        <div class="ctr">
          <input class="ctr-input" type="color" 
            value="${this.curSelectGridItemUserStyle?.backgroundColor||''}" 
            @change="${(e:any)=>{this.changeInput('backgroundColor',e)}}" />
        </div>
      </div>
    </div>`:``;
  }
  renderToobar(){
    if(!this.edit) return '';
    return html`<div class="tool-box">
      
    <i class="el-icon set-float">
      <!--[-->
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-subtract" viewBox="0 0 16 16">
        <path d="M0 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
      </svg>
      <!--]-->
    </i>
    <i class="el-icon close grid-item-close" style="font-size:20px;" >
      <!--[-->
      <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.184z"></path></svg>
      <!--]-->
    </i>
  </div>
  <div class="resize bottom-right" @mousedown="${this.gridItemResizeStart}" ></div>`

  }
  static styles = css`
  :host {
    display: block;
    padding: 0px;
    height:100%;
    overflow-x: hidden;
  }
  :host::-webkit-scrollbar{
    width: 8px;
    background: #b3b3b3;
   
  }
  :host::-webkit-scrollbar-thumb{
    width: 8px;
    background: #767676;
    border-radius: 5px;
  }
  :host::-webkit-scrollbar-track{
    background: transparent;
    border-radius: 0px;
  }
  .grid-layout {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .toolbar {
    position: absolute;
    right:5px;
    top:5px;
    padding:2px 3px;
    z-index: 999999;
    display:flex;
    background: #000;
    box-shadow: 2px 2px 5px #000;
    border-radius:3px;
    border:1px solid rgb(103 103 103);
  }
  .toolbar.vertical {
    top:20%;
    right:5px;
    flex-flow: column;
  }
  .toolbar .el-icon svg {
    width:18px;
    height: 18px;
  }
  .toolbar .el-icon {
    cursor: pointer;
    margin:3px 3px;
    border:1px solid #dbdbdb;
    border-radius: 3px;
    padding: 3px;
    display: inline-flex;
    width: 18px;height: 18px;
    background-color: #fff;
    color:#333;
  }
  .toolbar .el-icon:hover {
    background-color: #4097e4;
    color:#fff;
    opacity:0.7;
  }

  .toolbar .el-icon[active="true"] {
    background-color: #4097e4;
    color:#fff;
  }
  .toolbar .el-icon:active{
    background-color: rgb(131 177 217);
    color:#fff;
  }
  .toolbar .el-icon.forward svg {
    transform: scaleX(-1);
  }
  .old-data {
    opacity: 0.3;
  }
  .grid-sitting {
    width:100%;
    top:0px;
    position: absolute;
    z-index:-1
  }  
  .grid-item {
    display:block;
    position:absolute;
    min-width: 20px;
    min-height: 10px;
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
    
    outline:2px solid #a2c1d6;
  }
  .grid-item[float="true"] {
    box-shadow:rgb(0, 0, 0) 5px 5px 14px -10px;
  }
  .grid-item[float="true"] .tool-box .set-float {
    opacity: 1;
    color:#3250a7;
  }
  .grid-item:hover .resize {
    display: flex;
  }
  .grid-item .bottom-right {
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
 .grid-item .tool-box .el-icon:hover {
   cursor:pointer;
   opacity: 0.6;
  }
  .grid-item .resize > svg {
    color: rgb(160 160 160)
  }
  .grid-item .resize:hover {
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
 .grid-item[drag=true] .set-float {
   display: none;
 }
 .resize {
   position: absolute;
 }
 .style-box {
  position:relative;
 }
 .style-set {
  border:1px solid #9a9a9a;
  padding:10px;
  position:absolute;
  min-width:100px;
  min-height:100px;
  background: #181b1f;
  z-index:0;
  top:0px;
  right:40px;
  border-radius:3px;
  box-shadow:0px 0px 10px #000;
  color:#fff;
 }
 .style-set .item {
  margin:10px 0px;
 }
 .style-set .item > span {
  display: block;
  min-width: 125px;
  margin-right: 13px;
  color: #e2e2e2;
  font-size: 14px;
 }
 .style-set .ctr-input {
  height: 28px;
  width: 100%;
  border: 1px solid rgb(0, 0, 0);
  border-radius: 0px;
  background-color:#000;
  box-sizing: border-box;
  color:#fff;
  border:1px solid #424242;
 }
 .style-set .ctr-input option{
  height:28px;
  margin:5px;
 }
 .toolbar .el-icon.style-update-btn:hover{
  background-color:#fff;
  color:#333;
 }
 .toolbar .el-icon.style-update-btn[active="true"]{
    background-color: #4097e4;
    color:#fff;
 }
`;
}

