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
    let config = this.option;
    if (typeof (config) == 'string')
      // 使用配置文件
      config = JSON.parse(fs.readFileSync(config, "utf-8"));
    if (typeof (config) == 'object') {
      // 预渲染
      prerender(config).finally(callback);
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