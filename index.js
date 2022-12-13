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
exports.prerender = async function (config = {
  port: 9222,
  chrome: "",
}) {
  
}

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require('express');
const { Server } = require('http');

(async (config = {
  // 使用已开chrome时的--remote-debugging-port参数值
  port: 9222,
  // 没有已开chrome时自动打开chrome的运行程序路径
  chrome: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  // vue发布的目录
  dist: "dist",
  // 使用express对vue发布的目录提供网站服务
  serve: 21644,
  // 需要预渲染的路由页面
  pages: ['/', '/pre', '/dir/indir'],
}) => {
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

  // const pages = await browser.pages();
  // console.log("Get pages success!");

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
      if (temp == '/')
        temp = '/index';
      temp = config.dist + temp + ".html";
      const dir = path.dirname(temp);
      if (!fs.existsSync(dir))
        fs.mkdirSync(dir);
      console.log("page load complete", page.url(), temp);
      fs.writeFileSync(temp, await page.evaluate(() => "<!DOCTYPE html>" + document.documentElement.outerHTML));
    })
  }

  // let page = pages.find(i => i.url().startsWith("https://futcoin.net/en/reviews"));
  
  // console.log("已找到目标页面标签", page.url())
  

  // const FILE = "采集.csv"
  // fs.writeFileSync(FILE, "评论人,国家,时间,金币数,平台,星星数,内容,版本\r\n")

  // for (let i = 0; i < 100; i++) {
  //   console.log("正在采集", page.url())
  //   await page.waitForSelector(".fc-comment", {
  //     timeout: 0,
  //   });
  //   fs.appendFileSync(FILE, await page.evaluate(() => {
  //     var result = "";
  //     var comments = document.querySelectorAll(".fc-comment");
  //     for (var c of comments) {
  //       if (c.querySelector(".uk-card>.uk-text-left").innerText.indexOf(' ') == -1)
  //         continue;
  //       result += c.querySelector(".uk-first-column .uk-text-left").innerText + "," +
  //         ((i) => {
  //           var index = i.lastIndexOf('/') + 1;
  //           return i.substring(index, index + 2).toUpperCase();
  //         })(c.querySelector(".uk-first-column [data-uk-img]").dataset.src) + "," +
  //         c.querySelector(".uk-first-column .uk-text-muted").innerText + "," +
  //         ((i) => {
  //           return i = i.substring(1, i.indexOf(' ', 1)).replaceAll(',', '');
  //         })(c.querySelector(".uk-width-expand .uk-first-column").innerText) + "," +
  //         ((i) => {
  //           return i.startsWith(' PC') ? 'pc' : (i.startsWith(' PlayStation') ? 'ps4' : 'xbox')
  //         })(c.querySelector(".uk-width-expand .uk-text-nowrap").innerText) + "," +
  //         c.querySelector(".fc-comment-rating").querySelectorAll(".fc-icon-star").length + "," +
  //         '"' + c.querySelector(".uk-card>.uk-text-left").innerText.replaceAll('"', '""') + '",' +
  //         "fifa23" + "\r\n"
  //     }
  //     return result;
  //   }));
  //   // 点击下一页
  //   await page.click('[data-uk-icon="arrow-right"]');
  //   await page.waitForTimeout(2000);
  // }
  // console.log("采集完成");
})();