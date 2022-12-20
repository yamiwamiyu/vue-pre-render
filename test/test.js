const { prerender } = require('../index');

prerender(config = {
  // 使用已开chrome时的--remote-debugging-port参数值
  port: 9222,
  // 没有已开chrome时自动打开chrome的运行程序路径，chrome以外的浏览器貌似也可以
  chrome: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  // vue发布的目录
  dist: "dist",
  // 使用express对vue发布的目录提供网站服务
  serve: 21644,
  // 全局seo配置，会默认应用到全部页面
  seo: {
    // 网页标题
    title: "global title",
    // <meta name="keywords" content="keyword1, keyword2, keyword3">
    // 不使用数组时可以是字符串，关键词之间应该用', '隔开
    keywords: ["keyword1", "keyword2", "keyword3"],
    // <meta name="description" content="Your website description">
    description: "Your website description",
    // 其它meta信息，这里配置的keywords和description会覆盖
    meta: [
      { name: 'metaname1', content: 'meta content1' },
      { name: 'metaname2', content: 'meta content2' },
    ]
  },
  // 需要预渲染的页面路由
  // 如果页面有跳转的，例如需要登录的页面因为没有登录跳转到了登录页
  // 页面将预渲染默认内容，seo信息也将不会被渲染进页面
  pages: ['/', {
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
  }, '/dir/indir?param=value', '/nopre'],
})