const { Command } = require('commander');
const { prerender } = require('./index');
const fs = require('fs');

const program = new Command();

program
  .name('vue-pre-render')
  .version('0.1.0');

program.command('pre')
  .description('Crawl a SPA (Single-Page Application) and generate pre-rendered content')
  .argument('<string>', 'path of the json config file like pre-config.json')
  .action((path) => {
    prerender(JSON.parse(fs.readFileSync(path, "utf-8")));
  });

program.parse();