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

## 配置参数文档
#### 配置

| 字段       | 说明                                                                                                                              | 默认值   |
|----------|---------------------------------------------------------------------------------------------------------------------------------|-------|
| port     | 使用你已经打开的chrome浏览器进行预渲染，chrome浏览器的--remote-debugging-port参数值。0或自动检测到无法连接chrome浏览器时无效                                             | 9222  |
| chrome   | 没有已经打开的chrome浏览器时自动打开chrome的运行程序路径，chrome以外的浏览器貌似也可以。举例，Windows下此值像是C:/Program Files (x86)/Google/Chrome/Application/chrome.exe |       |
| headless | 预渲染时是否隐藏浏览器                                                                                                                     | false |
| dist     | SPA项目发布后的目录                                                                                                                     | dist  |
| serve    | 预渲染需要一个Express服务端，这是服务端的端口号，如果这个端口号被占用，就请更改一个可用的端口号                                                                             | 21644 |
| [seo](#seo)      | 预渲染的所有静态页面都适用的SEO配置                                                                                                             |       |
| pages    | 需要预渲染的所有页面的路由配置                                                                                                                 |       |

#### SEO

| 字段          | 说明                                                                                     |
|-------------|----------------------------------------------------------------------------------------|
| title       | 静态页面的Title                                                                             |
| keywords    | <meta name="keywords" content="{value}"><br>可以是数组例如['关键字1', '关键字2']<br>也可以是字符串例如'关键字1, 关键字2' |     |
| description | <meta name="keywords" content="{value}">，网站的描述                                         |
| meta        | 更多meta标签例如[{name:'MetaName', content:'MetaContent'}]                                   |

#### 路由

| 字段     | 说明                                                               |
|--------|------------------------------------------------------------------|
| url*    | 路由页面的地址，例如/或/index，可以配置带参路由例如/index/param或/index?key=value       |
| output | 静态页的输出路径，默认输出和url一致例如/index.html，可以配置成/index_en则输出/index_en.html |
| [seo](#seo)    | 针对当前路由静态页的SEO信息                                                  |



## webpack使用示例


```
const { defineConfig } = require('@vue/cli-service')
const { VuePreRender } = require('@yamiwamiyu/vue-pre-render')

module.exports = defineConfig({
  // ...
  //publicPath: "/", // 这里请不要使用"./"
  
  configureWebpack: {
    plugins: [new VuePreRender({

      seo: {
        title: "global title",
        keywords: ["keyword1", "keyword2", "keyword3"],
        description: "Your website global description",
        meta: [
          { name: 'metaname1', content: 'meta content1' },
          { name: 'metaname2', content: 'meta content2' },
        ]
      },

      pages: ['/', '/nopre', '/dir/indir?param=value', 
        {
          url: '/pre/abc',
          output: '/pre',
          seo: {
            title: "Pre Title",
            keywords: ["Pre Render", "Pre-render"],
            description: "Pre page is a test page",
            meta: [
              { name: 'pre', content: 'pre-render' },
            ]
          }
        }
      ],

    })],
  }
})
```
    
    
## 命令行使用示例

1.  在项目根目录下新建配置文件pre.config.json，配置内容大致如下

```
{
  "headless": false,
  "seo": {
    "title": "global title",
    "keywords": [
      "keyword1",
      "keyword2",
      "keyword3"
    ],
    "description": "Your website global description",
    "meta": [
      { 
        "name": "metaname1", 
        "content": "meta content1"
      },
      { 
        "name": "metaname2", 
        "content": "meta content2"
      }
    ]
  },
  "pages": ["/", "/pre", "/dir/indir", "/nopre"]
}
```

2.  在你需要预渲染时(一般是npm run build之后)，执行以下命令即可

```
node node_modules/@yamiwamiyu/vue-pre-render/cmd.js pre pre.config.json
```