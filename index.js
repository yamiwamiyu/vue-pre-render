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

/**
 * @param {import('.').SEO} seo 
 */
function seo(seo) {
  if (!seo) return;
  if (typeof (seo.keywords) != 'string')
    seo.keywords = seo.keywords.join(", ");
  
  if (seo.meta?.length)
    for (const meta of seo.meta)
      seo[meta.name] = meta.content;
}

function rroute(routes, parent) {
  for (let i = 0; i < routes.length; i++) {
    if (typeof (routes[i]) == "string")
      routes[i] = { path: routes[i] };
    const route = routes[i];
    seo(route.seo);
    if (parent) {
      // 子路由的path需要加上父路由的path
      if (route.ppath && !route.ppath.startsWith('/'))
        route.ppath = (parent.ppath || parent.path) + '/' + route.ppath;
      if (route.path && !route.path.startsWith('/'))
        route.path = (parent.ppath || parent.path) + '/' + route.path;
    }
    if (route.children) {
      rroute(route.children, route);
    }
  }
}

function serverGet(serve, responseIndex, routes) {
  for (const route of routes) {
    const path = route.ppath || route.path;
    serve.get(path, responseIndex);
    if ((pindex = path.indexOf('?')) >= 0)
      serve.get(path.substring(0, pindex), responseIndex);
    if (route.children)
      serverGet(serve, responseIndex, route.children);
  }
}

/** 获取浏览器实例
 * @param {import('.').Configuation} config
 * @returns {puppeteer.Browser}
 */
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

/**
 * @param {import('.').Configuation} config 
 * @param {puppeteer.Browser} browser
 * @param {import('.').Page} route
 * @returns {Promise}
 */
function renderPage(config, browser, route) {
  // 带[:参数]的路由没配置默认参数则不进行预渲染
  if (route.path.includes(':') && !route.ppath) {
    console.log("\x1b[33mpage with parameter skipped! please use ppath to set default parameter", route.path, "\x1b[0m");
    return;
  }
  const array = [];
  if (route.children && route.children.length) {
    for (const r of route.children) {
      const p = renderPage(config, browser, r);
      if (p)
        array.push(p);
    }
  }
  // 逐个打开路由页面，将预渲染页面的html写入对应路由.html
  let temp = route.ppath || route.path;
  array.push(browser.newPage().then(async (page) => {
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
      fs.mkdirSync(dir, { recursive: true });
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
  }).catch(() => {
    console.log('\x1b[41m', temp, "render error!", '\x1b[0m')
    config.error = (config.error ?? 0) + 1;
  }));
  config.total = (config.total ?? 0) + 1;
  return Promise.all(array);
}

/** 预渲染
 * @param {import('.').Configuation | string} config - 配置对象或者配置文件路径
 */
async function prerender(config) {
  const now = Date.now();

  config = Object.assign({
    port: 9222,
    headless: false,
    dist: "dist",
    serve: 21644,
  }, config);
  check(!fs.existsSync(config.dist), "Don't exists dist directory! " + path.resolve(__dirname, config.dist));
  seo(config.seo);
  rroute(config.routes);

  let browser = await getBrowser(config);

  const serve = express();
  serve.listen(config.serve);
  serve.use(express.static(config.dist));
  // 缓存index.html，history模式访问路由时，都因该返回index.html的内容
  let indexHtml = fs.readFileSync(config.dist + '/index.html', "utf-8");
  const responseIndex = (req, res) => res.send(indexHtml);
  serverGet(serve, responseIndex, config.routes);

  console.log("Express serve launched!", "http://localhost:" + config.serve + " in " + config.dist);

  for (const route of config.routes)
    route.exe = renderPage(config, browser, route);

  for (const route of config.routes)
    await route.exe;

  console.log("Pre rendering is complete!")
  console.log("All:", config.total, "Error:", config.error??0, "Elapsed:", ((Date.now() - now) / 1000).toFixed(2), 's');
  await browser.close();
}

exports.prerender = prerender;

/** 预渲染Webpack插件
 * @param {import('.').Configuation | string} - 配置对象或者配置文件路径
 */
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