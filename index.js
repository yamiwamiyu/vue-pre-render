// node -v v16.17.0
// npm -v 8.15.0

/*
puppeteer学习日记
npm官方地址：https://www.npmjs.com/package/puppeteer
官方文档：https://pptr.dev/
主要用法如下
import puppeteer from 'puppeteer-core'(已有Chrome浏览器) | 'puppeteer'(自动下载的Chromium浏览器);
1. 获取浏览器browser
   启动一个新实例：puppeteer.launch({
     headless: true,  // true: 无UI界面 / false: 弹出浏览器界面
     executablePath: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", // 已有Chrome浏览器时浏览器的运行路径
   })
   连接一个已开实例：puppeteer.connect({
     // 带参数--remote-debugging-port=9222运行chrome.exe，可以用快捷方式 -> 属性 -> 目标，或者cmd方式运行
     // 浏览器地址输入http://127.0.0.1:9222/json/version，可看见一个json对象，webSocketDebuggerUrl就是目标值
     browserWSEndpoint: "ws://127.0.0.1:9222/devtools/browser/fd848984-50fb-4ebb-9236-a8c62d6cb0a9",
   })
2. 获取页面page
   获取所有页签：const pages = await browser.pages()
   可通过find方法根据url找到目标页签：const page = pages.find(i => return i.url().startsWith('<your url>'))
   新开启一个页签：const page = await browser.newPage()
3. 页面操作
   修改url：await page.goto(url)
   等待页面加载成功：await page.waitFor***，常用等待某个dom加载完成await page.waitForSelector("选择器", {timeout: 0});
   执行js：await page.evaluate(() => { ...js代码，相当于Chrome F12的Console，return 结果 })
*/
function check(bool, err) {
  if (!bool) return;
  console.log('\x1b[41m', err, '\x1b[0m');
  exit();
}

exports.prerender = async function (config) {
  config = Object.assign({
    port: 9222,
    dist: "dist",
    serve: 21644,
  }, config);
  console.log("调用了prerender，参数", config)
}

// const puppeteer = require('puppeteer-core');
// const fs = require('fs');
// const path = require('path');
// const axios = require('axios');
// const express = require('express');
// const { exit } = require('process');

// // todo: 预渲染页面可以修改title和meta
// // todo: 多语言，动态meta，带参路由需要想办法解决
// // todo: 发布目录为./时可以不开express直接文件访问进行预渲染，但是多级目录可能会有问题
// // todo: 能连上已开的chrome就不用自己开新的chrome了
// // todo: 实际地址和路由不一致时预渲染index.html，例如页面检测需要登录最终跳转到了登录页时
// // todo: 使用launch打开浏览器时，每次打开localStorage都会是空的，需要渲染需要登录的页面时可以选用连接模式

(async (config = {
  // 使用已开chrome时的--remote-debugging-port参数值
  port: 9222,
  // 没有已开chrome时自动打开chrome的运行程序路径
  //chrome: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
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
  pages: ['/', '/pre', '/dir/indir', '/nopre'],
}) => {
  check(!fs.existsSync(config.dist), "Don't exists dist directory! " + path.resolve(__dirname, config.dist));

  let browser;
  if (config.chrome) {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: config.chrome,
      defaultViewport: null
    })
  } else {
    const browserWSEndpoint = await new Promise(resolve => {
      const url = "http://127.0.0.1:" + config.port + "/json/version";
      axios.get(url).then((ret) => {
        resolve(ret.data.webSocketDebuggerUrl);
      }).catch(err => {
        console.log("Can not connect chrome.", url);
      })
    })

    console.log("browserWSEndpoint", browserWSEndpoint);

    browser = await puppeteer.connect({ browserWSEndpoint, defaultViewport: null });
  }

  console.log("Connect chrome success!");

  const serve = express();
  serve.listen(config.serve);
  serve.use(express.static(config.dist));
  
  // 缓存index.html，history模式访问路由时，都因该返回index.html的内容
  const indexHtml = fs.readFileSync(config.dist + '/index.html', "utf-8");
  const responseIndex = (req, res) => res.send(indexHtml);
  for (const route of config.pages)
    serve.get(route, responseIndex);

  console.log("Express serve launched!", "http://localhost:" + config.serve + " in " + config.dist);

  for (const route of config.pages) {
    // 逐个打开路由页面，将预渲染页面的html写入对应路由.html
    let temp = route;
    browser.newPage().then(async (page) => {
      await page.goto("http://localhost:" + config.serve + route);
      await page.waitForNetworkIdle({
        idleTime: 1000,
        timeout: 5000,
      })
      let html = temp;
      if (html == '/')
        html = '/index';
      html = config.dist + html + ".html";
      const dir = path.dirname(html);
      if (!fs.existsSync(dir))
        fs.mkdirSync(dir);
      if (await page.evaluate(t => location.pathname != t, temp)) {
        console.log("The route page is redirected", temp, "->", page.url());
      }
      fs.writeFileSync(html, await page.evaluate(() => {
        // 下次启动浏览器这里设置的值将会不见，所以登录问题不能这样解决
        // localStorage.setItem("test", "Puppeteer设置的localStorage值");
        // 替换title，meta
        //document.title = 
        return "<!DOCTYPE html>" + document.documentElement.outerHTML;
      }));
      // await page.close();
    })
  }
})();