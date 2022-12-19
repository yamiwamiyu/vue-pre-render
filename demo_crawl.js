const { crawl } = require('./index');
const fs = require('fs');

const data = [];
let handle;
crawl({ port: 9222 }, async (r) => {
  if (r.request().resourceType() != 'xhr')
    return;
  if (r.url().indexOf('offer/search?') < 0)
    return;
  const json = await r.json();
  data.push(...json.payload.results);
  console.log("crawl data", data.length);
  // continue crawl
  handle();
}, async (page) => {
  page.goto("https://www.g2g.com/categories/wow-boosting-service?sort=most_recent", { timeout: 0 });
  while (true) {
    // wait xhr response data
    await new Promise(resolve => handle = resolve);
    // goto next page, over if can't continue
    if (await page.evaluate(() => {
      const buttons = document.querySelectorAll('.q-pagination>button');
      const button = buttons[buttons.length - 1];
      if (button.disabled)
        return true;
      else
        button.click();
    })) {
      console.log("crawl complete of", data.length, "! in file -> 'crawl.json'");
      fs.writeFileSync("crawl.json", JSON.stringify(data));
      break;
    }
  }
})