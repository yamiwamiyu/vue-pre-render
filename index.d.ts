/** 预渲染配置 */
export declare interface Configuation {
  /** 本地Chrome浏览器的文件路径
   * 
   * 当你担心预渲染的效果和你本地浏览器浏览效果不一致时
   * 可以使用你本地安装的浏览器进行预渲染
   * 
   * @example
   * Windows系统下此值像是C:/Program Files (x86)/Google/Chrome/Application/chrome.exe
   */
  chrome?: String,
  /** 连接本机已打开的Chrome浏览器进行预渲染，此时Chrome有一个端口号，默认9222
   * 
   * @example
   * 运行 chrome.exe 需要带参数 --remote-debugging-port=9222
   * 1. 快捷方式：
   * 右键 -> 新建快捷方式 -> 输入C:/Program Files (x86)/Google/Chrome/Application/chrome.exe --remote-debugging-port=9222
   * 双击快捷方式打开的 chrome 浏览器就可以通过port连接
   * 
   * 2. CMD运行
   * Win + R -> 输入 cmd 回车 -> 输入 "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe" --remote-debugging-port=9222 回车
   * 注意引号一起复制，打开的 chrome 浏览器就可以通过port连接
   */
  port?: Number,
  /** 预渲染时是否隐藏浏览器，默认false */
  headless?: Boolean,
  /** VUE项目执行npm run build生成的目录，默认dist */
  dist?: String,
  /** 预渲染需要一个Express服务端，这是服务端的端口号，如果这个端口号被占用，就请更改一个可用的端口号 */
  serve?: Number,
  /** 预渲染的所有静态页面都适用的SEO配置，直接修改你的public/index.html页可以达到相同的效果 */
  seo?: SEO,
  /** 需要预渲染的所有页面的配置 */
  routes: (string | Page)[],
}

/** 页面SEO信息 */
export declare interface SEO {
  /** 静态页面的Title */
  title: String,
  /** 页面meta关键词，逗号分隔的字符串或者数组数组 */
  keywords: String | String[],
  /** 页面meta描述 */
  description: String,
  /** 更多meta标签 */
  meta: Meta[],
}

/** 页面meta标签信息 */
export declare interface Meta {
  /** meta标签name属性 */
  name: String,
  /** meta标签content属性 */
  content: String,
}

/** 一个需要预渲染的页面配置 */
export declare interface Page {
  /** 路由页面的地址
   * @example
   * / 或 /index -> index.html
   * 
   * 带参路由
   * /index/:param -> /index/param.html
   * /index?key=value -> /index.html
   */
  path: String,
  /** 路由的子路由页面，子路由将一并进行预渲染，为了直接兼容路由配置 */
  children?: Page[];
  /** 路由页面的地址，当path配置的是带参路由时，默认参数的预渲染地址可以使用ppath来指定 */
  ppath?: String,
  /** 静态页的输出路径，默认和path一致 */
  output?: String,
  /** 针对当前路由静态页的SEO信息 */
  seo?: SEO,
}