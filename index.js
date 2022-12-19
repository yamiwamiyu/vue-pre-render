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

let puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require('express');
const { exit } = require('process');

function check(bool, err) {
  if (!bool) return;
  console.log('\x1b[41m', err, '\x1b[0m');
  exit();
}

function seo(seo) {
  if (!seo) return;
  if (typeof (seo.keywords) != 'string')
    seo.keywords = seo.keywords.join(", ");
  if (seo.meta?.length)
    for (const meta of seo.meta)
      seo[meta.name] = meta.content;
}

async function getBrowser(config) {
  let browser;
  if (config.chrome) {
    browser = await puppeteer.launch({
      headless: config.headless,
      executablePath: config.chrome,
      defaultViewport: null
    })
    console.log("Open chrome success!");
  } else {
    let browserWSEndpoint;
    if (config.port) {
      browserWSEndpoint = await new Promise(resolve => {
        const url = "http://127.0.0.1:" + config.port + "/json/version";
        axios.get(url).then((ret) => {
          resolve(ret.data.webSocketDebuggerUrl);
        }).catch(err => {
          console.log("Can not connect chrome.", url);
          resolve(undefined);
        })
      })
    }
    if (browserWSEndpoint) {
      browser = await puppeteer.connect({ browserWSEndpoint, defaultViewport: null });
      // 不需要关闭chrome
      browser.close = () => {};
      console.log("Connect chrome success!");
    } else {
      puppeteer = require('puppeteer');
      browser = await puppeteer.launch({
        headless: config.headless,
        defaultViewport: null
      });
      console.log("Open chromium success!");
    }
  }
  return browser;
}

async function prerender(config) {
  config = Object.assign({
    port: 9222,
    headless: false,
    dist: "dist",
    serve: 21644,
  }, config);
  check(!fs.existsSync(config.dist), "Don't exists dist directory! " + path.resolve(__dirname, config.dist));
  seo(config.seo);
  for (let i = 0; i < config.pages.length; i++) {
    if (typeof (config.pages[i]) == "string")
      config.pages[i] = { url: config.pages[i] };
    seo(config.pages[i].seo);
  }

  let browser = await getBrowser(config);

  const serve = express();
  serve.listen(config.serve);
  serve.use(express.static(config.dist));
  // 缓存index.html，history模式访问路由时，都因该返回index.html的内容
  let indexHtml = fs.readFileSync(config.dist + '/index.html', "utf-8");
  // test: 保留index.html到__index.html，方便出错需要重新预渲染时不用重新发布项目
  // if (fs.existsSync(config.dist + '/__index.html')) {
  //   indexHtml = fs.readFileSync(config.dist + '/__index.html', "utf-8");
  //   console.log("use __index.html")
  // } else {
  //   fs.copyFileSync(config.dist + '/index.html', config.dist + '/__index.html');
  // }
  const responseIndex = (req, res) => res.send(indexHtml);
  for (const route of config.pages) {
    serve.get(route.url, responseIndex);
    if ((pindex = route.url.indexOf('?')) >= 0)
      serve.get(route.url.substring(0, pindex), responseIndex);
  }

  console.log("Express serve launched!", "http://localhost:" + config.serve + " in " + config.dist);

  for (const route of config.pages) {
    // 逐个打开路由页面，将预渲染页面的html写入对应路由.html
    let temp = route.url;
    route.exe = browser.newPage().then(async (page) => {
      await page.goto("http://localhost:" + config.serve + temp);
      await page.waitForNetworkIdle({
        idleTime: 1000,
        timeout: 5000,
      })
      if ((pindex = temp.indexOf('?')) >= 0)
        temp = temp.substring(0, pindex);
      let html;
      if (route.output)
        html = route.output;
      else
        html = temp;
      if (html == '/')
        html = '/index';
      html = config.dist + html + ".html";
      const dir = path.dirname(html);
      if (!fs.existsSync(dir))
        fs.mkdirSync(dir);
      const redirected = await page.evaluate(t => location.pathname != t, temp);
      if (redirected) {
        console.log("\x1b[33mpage redirected!", temp, "->", await page.evaluate(() => location.pathname), "\x1b[0m");
        fs.writeFileSync(html, indexHtml);
      } else {
        fs.writeFileSync(html, await page.evaluate((config, route) => {
          document.title = route.seo?.title || config.seo?.title || document.title;
          function meta(key) {
            let meta = document.querySelector("meta[name='" + key + "']");
            if (!meta) {
              meta = document.createElement("meta");
              meta.name = key;
              document.head.appendChild(meta);
            }
            meta.content = (route.seo && route.seo[key]) || (config.seo && config.seo[key]) || meta.content;
          }
          meta('keywords');
          meta('description');
          if (config.seo?.meta)
            for (const item of config.seo.meta)
              meta(item.name);
          if (route.seo?.meta)
            for (const item of route.seo.meta)
              meta(item.name);
          return "<!DOCTYPE html>" + document.documentElement.outerHTML;
        }, config, route));
      }
      if (!redirected) {
        console.log("render complete!", temp);
        await page.close();
      }
    })
  }

  for (const route of config.pages)
    await route.exe;

  console.log("Pre rendering is complete!")
  await browser.close();
}

exports.prerender = prerender;

function VuePreRender(option) { this.option = option; }
VuePreRender.prototype.apply = function (compiler) {
  compiler.hooks.afterEmit.tapAsync('VuePreRender', (compilation, callback) => {
    console.log(
      '这里表示了资源的单次构建的 `compilation` 对象：',
      compilation,
      '还有使用插件的option',
      this.option
    );
    let config = this.option;
    if (typeof (config) == 'string')
      // 使用配置文件
      config = JSON.parse(fs.readFileSync(config, "utf-8"));
    if (typeof (config) == 'object') {
      // 预渲染
      new Promise().then(async () => {
        await prerender(config)
      }).finally(() => callback());
    } else {
      console.log("error compilation option!", this.option);
      callback();
    }
  })
}
exports.VuePreRender = VuePreRender;

exports.crawl = async function (config, onResponse, crawl) {
  let browser = await getBrowser(config);
  const page = await browser.newPage();
  if (onResponse)
    page.on("response", (r) => {
      r.url()
      onResponse(r);
    });
  await crawl(page);
  await page.close();
  await browser.close();
}

// exports.prerender(config = {
//   // 使用已开chrome时的--remote-debugging-port参数值
//   port: 9222,
//   // 没有已开chrome时自动打开chrome的运行程序路径，chrome以外的浏览器貌似也可以
//   chrome: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
//   // vue发布的目录
//   dist: "dist",
//   // 使用express对vue发布的目录提供网站服务
//   serve: 21644,
//   // 全局seo配置，会默认应用到全部页面
//   seo: {
//     // 网页标题
//     title: "global title",
//     // <meta name="keywords" content="keyword1, keyword2, keyword3">
//     // 不使用数组时可以是字符串，关键词之间应该用', '隔开
//     keywords: ["keyword1", "keyword2", "keyword3"],
//     // <meta name="description" content="Your website description">
//     description: "Your website description",
//     // 其它meta信息，这里配置的keywords和description会覆盖
//     meta: [
//       { name: 'metaname1', content: 'meta content1' },
//       { name: 'metaname2', content: 'meta content2' },
//     ]
//   },
//   // 需要预渲染的页面路由
//   // 如果页面有跳转的，例如需要登录的页面因为没有登录跳转到了登录页
//   // 页面将预渲染默认内容，seo信息也将不会被渲染进页面
//   pages: ['/', {
//     url: '/pre/abc',
//     output: '/pre',
//     seo: {
//       title: "Pre Title",
//       keywords: ["Pre Render", "Pre-render"],
//       description: "Pre page is a test page",
//       meta: [
//         { name: 'pre', content: 'pre-render' },
//       ]
//     }
//   }, '/dir/indir?param=value', '/nopre'],
// })