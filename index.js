// exports.prerender = function () {
  
// }

import puppeteer from 'puppeteer-core';

// customer_name: $(".fc-comment .uk-first-column .uk-text-left").innerText
// country: var img = $(".fc-comment .uk-first-column [data-uk-img]").style.backgroundImage; var index = img.lastIndexOf('/') + 1; img = img.substring(index, index + 2)
// showtime: $(".fc-comment .uk-first-column .uk-text-muted").innerText
// order_coins: var text = $(".fc-comment .uk-width-expand .uk-first-column").innerText; text = text.substring(1, text.indexOf(' ', 1)).replace(',', '');
// platform: var t = $(".fc-comment .uk-width-expand .uk-text-nowrap").innerText; t'.startsWith(' PC') ? 'pc' : (t.startsWith(' PlayStation') ? 'ps4' : 'xbox')
// stars: $(".fc-comment .fc-comment-rating").querySelectorAll(".fc-icon-star").length
// comment: $(".fc-comment .uk-card>.fc-text-medium").innerText

(async () => {
  // const browser = await puppeteer.launch({
  //   headless: false,
  //   executablePath: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  // });

  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://127.0.0.1:9222/devtools/browser/fd848984-50fb-4ebb-9236-a8c62d6cb0a9",
    defaultViewport: null
  });

  const pages = await browser.pages();
  let page = pages.find(i => {
    console.log("url?", i.url())
    return i.url().startsWith("https://futcoin.net/en/reviews");
  });
  
  console.log("已找到目标页面标签", page)
  await page.waitForSelector(".fc-comment", {
    timeout: 0,
  });
  console.log("页面已展示完毕")

  var result = "customer_name,country,showtime,order_coins,platform,stars,comment\r\n";
  // Extract the results from the page.
  result += await page.evaluate(() => {
    var result = "";
    var comments = document.querySelectorAll(".fc-comment");
    for (var c of comments) {
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
        c.querySelector(".uk-card>.uk-text-left").innerText + "," +
        "fifa23" + "\r\n"
    }
    return result;
  });
  // Print all the files.
  console.log(result);
})();