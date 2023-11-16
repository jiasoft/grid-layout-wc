# \<grid-layout-wc>

This webcomponent follows the [open-wc](https://github.com/open-wc/open-wc) recommendation.

## Installation

```bash
npm i grid-layout-wc
```

## Usage VUE DEMO

```html
<script type="module">
  import 'grid-layout-wc/grid-layout-wc.js';
  const layoutList = [
    {x: 1, y: 1, w: 44, h: 40,"slot":"1","id":1},
    {x: 46, y: 1, w: 81, h: 40,"slot":"2","id":2},
    {x: 1, y: 42, w: 69, h: 35,"slot":"3","id":3},
    {x: 71, y: 42, w: 56, h: 35,"slot":"4","id":4},
    {x: 1, y: 55, w: 37, h: 34,"slot":"5","id":5,float: true}
  ]
  const isEdit = ref(false);
  const onEdit = (e) => {
    console.log(e)
    isEdit.value = true;
  }
  const onClose = (e) => {
    console.log(e);
    isEdit.value = false;
  }
  const onSave = (e) => {
    console.log(e);
  }
</script>

<grid-layout-wc :layoutData="layoutList" :edit="isEdit" @close="onClose" @save="onSave">
  <div slot="1">
    <highcharts01 />
  </div>
  <div slot="2">
    <highcharts02 />
  </div>
  <div slot="3" >
    <highcharts03 />
  </div>
  <div slot="4" >
    <highcharts04 />
  </div>
  <div slot="5">
    <highcharts05 />
  </div>
</grid-layout-wc>
```



## Tooling configs

For most of the tools, the configuration is in the `package.json` to reduce the amount of files in your project.

If you customize the configuration a lot, you can consider moving them to individual files.

## Local Demo with `web-dev-server`

```bash
npm start
```

To run a local development server that serves the basic demo located in `demo/index.html`
##发布
```bash
npm publish
```

## vue demo
https://github.com/jiasoft/vue-demo-grid-layout-wc

## angular demo 
https://github.com/jiasoft/ng-demo-grid-layout-wc

## react demo
https://github.com/jiasoft/react-demo-grid-layout-wc