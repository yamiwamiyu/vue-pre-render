# vue-pre-render

<hr />
用于SPA项目的预渲染

## 特色

1.  配置**简单**，专注SEO，路由可带参数
2.  渲染**快速**
3.  支持**webpack**和**命令行**两种模式


## 安装教程


```
npm i @yamiwamiyu/vue-pre-render
```


## 使用教程

### 1. VUE Router请使用createWebHistory

```
// ./src/router.js
import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  // please use createWebHistory
  history: createWebHistory(process.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('./components/index') },
    { path: '/pre/:param', component: () => import('./components/pre') },
    { path: '/dir/indir', component: () => import('./components/dir/indir') },
    { path: '/nopre', component: () => import('./components/nopre') },
  ]
})
```

### 2. webpack使用示例

将 seo 信息直接写入 routes 可以复用于webpack
```
// ./routes.js
exports.routes = [
  { path: '/', component: () => import('./components/index') },
  { path: '/pre/:param', component: () => import('./components/pre') },
  { path: '/dir/indir', component: () => import('./components/dir/indir') },
  { path: '/nopre', component: () => import('./components/nopre') },
]

// ./src/router.js
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from '../routes'

export default createRouter({
  // please use createWebHistory
  history: createWebHistory(process.env.BASE_URL),
  routes,
})
```

在VUE3工程里一般配置文件叫**vue.config.js**，内容如下

```
// ./vue.config.js
const { defineConfig } = require('@vue/cli-service')
const { VuePreRender } = require('@yamiwamiyu/vue-pre-render')
// 直接使用配置的路由进行所有路由页面的预渲染，当然你也可以自定义
const { routes } = require('./routes')

module.exports = defineConfig({
  // ...
  //publicPath: "/", // 这里请不要使用"./"
  
  configureWebpack: {
    plugins: process.env.NODE_ENV === 'production' ? 
      [new VuePreRender({ routes, })] 
      : []
  }
})
```


### 3. 命令行使用示例

1.  在项目根目录下新建配置文件pre.config.json，配置内容大致如下

```
{
  "headless": true,
  "routes": ["/", "/pre", "/dir/indir", "/nopre"]
}
```

2.  在你需要预渲染时(一般是`npm run build`之后)，执行以下命令即可

```
node node_modules/@yamiwamiyu/vue-pre-render/cmd.js pre pre.config.json
```

## 配置参数文档
#### 配置

| 字段       | 说明                                                                                                                              | 默认值   |
|----------|---------------------------------------------------------------------------------------------------------------------------------|-------|
| chrome   | 当你担心预渲染的效果和你本地浏览器浏览效果不一致时，可以使用你本地安装的浏览器进行预渲染。例如Windows系统下此值像是C:/Program Files (x86)/Google/Chrome/Application/chrome.exe |       |
| headless | 预渲染时是否隐藏浏览器                                                                                                                     | false |
| dist     | VUE项目执行`npm run build`生成的目录                                                                                                                     | dist  |
| serve    | 预渲染需要一个Express服务端，这是服务端的端口号，如果这个端口号被占用，就请更改一个可用的端口号                                                                             | 21644 |
| [seo](#seo)      | 预渲染的所有静态页面都适用的SEO配置，直接修改你的public/index.html页可以达到相同的效果                                                                                                             |       |
| [routes(*)](#路由)    | 需要预渲染的所有页面的路由配置                                                                                                                 |       |

#### SEO

| 字段          | 说明                                                                                     |
|-------------|----------------------------------------------------------------------------------------|
| title       | 静态页面的Title                                                                             |
| keywords    | `<meta name="keywords" content="{value}">`<br>可以是数组例如['关键字1', '关键字2']<br>也可以是字符串例如'关键字1, 关键字2' |     |
| description | `<meta name="keywords" content="{value}">`，网站的描述                                         |
| meta        | 更多meta标签例如[{name:'MetaName', content:'MetaContent'}]                                   |

#### 路由

| 字段     | 说明                                                               |
|--------|------------------------------------------------------------------|
| path(*)    | 路由页面的地址，例如/或/index<br>可以配置带参路由例如/index/param(生成/index/param.html)或<br>/index?key=value(生成/index.html)       |
| ppath  | 路由页面的地址，当path配置的是带参路由时，默认参数的预渲染地址可以使用ppath来指定 |
| children | 路由的子路由页面，子路由将一并进行预渲染，为了直接兼容路由配置 |
| output | 静态页的输出路径，默认输出和url一致例如/或/index将输出/index.html，设置my_index则可以输出为my_index.html |
| [seo](#seo)    | 针对当前路由静态页的SEO信息                                                  |


## 完整示例
```
// ./vue.config.js
const { defineConfig } = require('@vue/cli-service')
const { VuePreRender } = require('@yamiwamiyu/vue-pre-render')

module.exports = defineConfig({
  // ...
  //publicPath: "/", // 这里请不要使用"./"
  
  configureWebpack: {
    plugins: [new VuePreRender({ routes: [
      { path: '/' },
      {
        path: '/news'
        children: [
          {
            path: '/news/:id',
            // ppath可以预渲染id为1时的页面，否则带[:参数]的path将不会预渲染
            ppath: '/news/1',
          }
        ]
      },
      {
        path: '/privacy',
        // ppath可以预渲染lang='en'时的页面，和[:参数]不同，有没有ppath都会预渲染
        ppath: '/privacy?lang=en',
        // 默认为privacy.html，这样就可以输出/en_privacy.html
        output: '/en_privacy',
      },
      {
        path: '/about',
        // 可以定制/about页的seo信息
        seo: { title: 'About Us' }
      },
    ]})],
  }
})
```


## 使用效果演示

1.  渲染中
```
Connect chrome success!
Express serve launched! http://localhost:21644 in dist
page redirected! /nopre -> /
render complete! /pre
render complete! /dir/indir
render complete! /
Pre rendering is complete!
```

`page redirected! /nopre -> /` 代表路由页面从/nopre跳转到了/<br>出现这种情况的原因例如页面需要登录才能展示，由于没有登录而跳转到了登录页<br>虽然最终也生成了/nopre.html，但是/nopre.html的内容是原始的/index.html的内容


2.  输出结果
- index.html
- pre.html
- nopre.html
- dir/
  - indir.html