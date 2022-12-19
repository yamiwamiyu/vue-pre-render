const puppeteer = require('puppeteer-core');
const axios = require('axios');
const fs = require('fs');

(async () => {
  const browserWSEndpoint = await new Promise(resolve => {
    const url = "http://127.0.0.1:" + config.port + "/json/version";
    axios.get(url).then((ret) => {
      resolve(ret.data.webSocketDebuggerUrl);
    }).catch(err => {
      console.log("Can not connect chrome.", url);
    })
  })

  browser = await puppeteer.connect({ browserWSEndpoint, defaultViewport: null });

  const pages = await browser.pages();

  const page = pages.find(i => i.url().startsWith("https://futcoin.net/en/reviews"));
  
  console.log("已找到目标页面标签", page.url())

  const FILE = "采集.csv"
  fs.writeFileSync(FILE, "评论人,国家,时间,金币数,平台,星星数,内容,版本\r\n")

  for (let i = 0; i < 100; i++) {
    console.log("正在采集", page.url())
    await page.waitForSelector(".fc-comment", {
      timeout: 0,
    });
    fs.appendFileSync(FILE, await page.evaluate(() => {
      var result = "";
      var comments = document.querySelectorAll(".fc-comment");
      for (var c of comments) {
        if (c.querySelector(".uk-card>.uk-text-left").innerText.indexOf(' ') == -1)
          continue;
        result += c.querySelector(".uk-first-column .uk-text-left").innerText + "," +
          ((i) => {
            var index = i.lastIndexOf('/') + 1;
            return i.substring(index, index + 2).toUpperCase();
          })(c.querySelector(".uk-first-column [data-uk-img]").dataset.src) + "," +
          c.querySelector(".uk-first-column .uk-text-muted").innerText + "," +
          ((i) => {
            return i = i.substring(1, i.indexOf(' ', 1)).replaceAll(',', '');
          })(c.querySelector(".uk-width-expand .uk-first-column").innerText) + "," +
          ((i) => {
            return i.startsWith(' PC') ? 'pc' : (i.startsWith(' PlayStation') ? 'ps4' : 'xbox')
          })(c.querySelector(".uk-width-expand .uk-text-nowrap").innerText) + "," +
          c.querySelector(".fc-comment-rating").querySelectorAll(".fc-icon-star").length + "," +
          '"' + c.querySelector(".uk-card>.uk-text-left").innerText.replaceAll('"', '""') + '",' +
          "fifa23" + "\r\n"
      }
      return result;
    }));
    // 点击下一页
    await page.click('[data-uk-icon="arrow-right"]');
    await page.waitForTimeout(2000);
  }
  console.log("采集完成");
})()

